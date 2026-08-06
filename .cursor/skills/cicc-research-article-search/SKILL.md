---
name: cicc-research-article-search
description: 基于中金点睛公众号文章内容，支持自然语言智能检索解读，全面覆盖公司、行业、宏观、策略、固收、外汇、大宗等研究体系，获取文章标题、发布日期、正文片段等信息。
metadata:
  openclaw:
    requires:
      env: [APP_ID, APP_SECRET]
      bins: [python3, pip3]
version: 1.0.2
---
# 中金网页内容搜索

通过**自然语言查询**检索中金内部知识库的文章内容，支持获取文章标题、发布时间、正文摘要等信息。

## 适用场景

- **内部文档检索**：查找中金内部知识库中的相关文档
- **资讯文章搜索**：获取特定主题的文章列表和摘要
- **研究资料查找**：搜索与研究相关的内部文章
- **热点追踪**：查询特定热点主题的相关文章

## 密钥来源与安全说明

- 本技能使用两个环境变量：`APP_ID`, `APP_SECRET`。
- `APP_ID`, `APP_SECRET` 由中金点睛（`https://www.research.cicc.com`）签发，用于其接口鉴权。
- 在提供密钥前，请先确认密钥来源、可用范围、有效期及是否支持重置/撤销。
- 禁止在代码、提示词、日志或输出文件中硬编码/明文暴露密钥。

## 功能范围

### 基础检索能力
- 检索中金内部知识库的文章内容
- 提取文章标题、发布时间、正文摘要
- 返回结构化文本内容（从 POST 接口获取数据）
- 支持将结果保存为本地 `.txt` 文件，便于追溯与复盘

### 输入要求
- **query**（必填）：查询关键词，建议包含明确的目标（主题、关键词等）
- **APP_ID**（必填）：应用ID，通过环境变量或命令行参数传入
- **APP_SECRET**（必填）：应用密钥，通过环境变量或命令行参数传入

### 查询示例

| 类型 | query 示例 |
|---|---|
| 行业分析 | 半导体行业、医药板块分析 |
| 主题热点 | 人工智能、新能源、碳中和 |
| 宏观政策 | 货币政策、财政政策解读 |
| 投资策略 | 资产配置、投资组合建议 |

## 快速开始

### 1. 命令行调用

```bash
# 读取环境变量
# Linux/mac OS
your_app_id=$APP_ID
your_app_secret=$APP_SECRET
# windows
your_app_id=%APP_ID%
your_app_secret=%APP_SECRET%

python scripts/get_data.py "具身机器人研报"

# 或通过命令行参数传入
python scripts/get_data.py "人工智能发展趋势" --app-id "your_app_id" --app-secret "your_app_secret"
```

**输出示例**
```text
正在保存结果到文件：cicc_research_article_search_20260424172139.txt
文件保存成功！

==================================================
✅ 任务完成！结果已保存至：/scripts/answer/cicc_research_article_search_20260424172139.txt
📝 搜索结果：
（文章列表内容）
==================================================
```

**参数说明：**

| 参数 | 说明 | 必填 |
|---|---|---|
| `query`（位置参数） | 自然语言查询文本 | ✅ |
| `--app-id` | 应用ID（也可通过环境变量APP_ID设置） | ✅ |
| `--app-secret` | 应用密钥（也可通过环境变量APP_SECRET设置） | ✅ |
| `--no-save` | 仅输出结果，不写入本地文件 | 否 |

### 2. 代码调用

```python
import asyncio
from pathlib import Path
from scripts.get_data import query_search_data

async def main():
    result = await query_search_data(
        query="人工智能发展趋势",
        app_id="your_app_id",
        app_secret="your_app_secret",
        output_dir=Path("workspace/cicc-research-article-search"),
        save_to_file=True,
    )
    if result.get("error"):
        print(f"错误: {result['error']}")
    else:
        print(result["content"])
        if result.get("output_path"):
            print("已保存至:", result["output_path"])

asyncio.run(main())
```

## 认证流程说明

本技能采用 OAuth 2.0 client_credentials 模式进行身份认证：

1. 使用 `APP_ID` 和 `APP_SECRET` 调用 `/oauth2.0/accessToken` 获取 access_token
2. 将 access_token 写入请求 Header 的 `Authorization: Bearer {token}` 字段
3. 调用 `/llm/dianjing-agent/search/integration` POST 接口获取搜索结果

## 输出文件说明

| 文件                                   | 说明 |
|--------------------------------------|---|
| `cicc_research_article_search_<DATETIME>.txt` | 搜索结果文本（包含文章标题、时间、正文） |

## 返回字段说明

- `query`：原始查询语句
- `content`：格式化后的搜索结果文本
- `output_path`：当 `save_to_file=True` 且有内容时，返回保存路径
- `raw`：原始接口返回的完整数据列表，便于调试或二次处理
- `error`：检索失败时返回错误信息


## 常见问题

**获取Token失败怎么办？**  
→ 请检查 APP_ID 和 APP_SECRET 是否正确配置，确认网络可达网关地址。

**如何只看输出，不落盘？**
```bash
python scripts/get_data.py "人工智能发展趋势" --no-save
```

**为什么需要 APP_ID 和 APP_SECRET？**  
→ 本技能需要通过网关认证才能访问中金内部搜索数据，请从管理员处获取凭证。

## 合规说明

- 查询前自动执行**敏感词校验**和**限制名单校验**，命中任一校验将拒绝查询
- 禁止在代码或提示词中硬编码账号 ID、会话 ID 或 token。
- 环境变量按敏感信息处理，不在日志或回复中泄露。
- 检索失败时不得编造事实，应返回明确错误或不确定性说明。
- 输出应保持可追溯、可审计。