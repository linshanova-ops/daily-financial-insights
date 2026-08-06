import argparse
import hmac
import json
import os
import uuid
from datetime import datetime
from hashlib import sha256
from pathlib import Path
from typing import Dict, Any, Optional, List, AsyncGenerator
import requests

# █████████████████████████████████████████████████████████████████████████
# ██                                                                  ██
# ██   ██████╗██╗ ██████╗ ██████╗     ██████╗ ███████╗███████╗███████╗██╗
# ██  ██╔════╝██║██╔════╝██╔════╝     ██╔══██╗██╔════╝██╔════╝██╔═══╝██║
# ██  ██║     ██║██║     ██║          ██████╔╝█████╗  ███████╗█████╗  ██║
# ██  ██║     ██║██║     ██║          ██╔══██╗██╔══╝  ╚════██║██╔══╝  ██║
# ██  ╚██████╗██║╚██████╗╚██████╗     ██║  ██║███████╗███████║███████╗███████╗
# ██   ╚═════╝╚═╝ ╚═════╝ ╚═════╝     ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚══════╝
# ██                                                                  ██
# ██           ⚠️  CICC WEB SEARCH CONFIGURATION ⚠️                    ██
# ██                                                                  ██
# ██    本技能用于搜索中金内部知识库文章，通过POST接口获取数据            ██
# ██    需要配置 APP_ID 和 APP_SECRET 环境变量进行身份认证              ██
# ██                                                                  ██
# █████████████████████████████████████████████████████████████████████████

# 配置项
CICC_BASE_API_URL = "https://www.research.cicc.com/api"
DEFAULT_OUTPUT_DIR = Path.cwd() / "answer"
TIMEOUT_SECONDS = 60
API_PATH = "/llm/dianjing-agent/search/integration"


os.environ['no_proxy'] = '*'


def request_cicc_access_token(app_id: str, app_secret: str) -> str:
    """ 获取CICC access token，增加参数校验和异常处理  """
    # 校验参数非空
    if not app_id or not app_secret:
        raise ValueError("APP_ID 和 APP_SECRET 不能为空")

    url = f'{CICC_BASE_API_URL}/oauth2.0/accessToken'
    data = {
        "grant_type": "client_credentials",
        "client_id": app_id,
        "client_secret": app_secret,
    }
    try:
        response = requests.post(
            url,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            data=data,
            stream=False,
            timeout=10,
        )
        response.raise_for_status()  # 触发HTTP状态码异常
        response_json = response.json()
        if response_json.get('code') != 0:
            raise RuntimeError(f'获取Token失败: {response_json.get("msg", "未知错误")}')

        access_token = response_json['data'].get('accessToken')
        if not access_token:
            raise RuntimeError("响应中未获取到有效的accessToken")

        return access_token

    except requests.exceptions.RequestException as e:
        raise RuntimeError(f'Token请求网络异常: {str(e)}')
    except json.JSONDecodeError:
        raise RuntimeError("Token响应不是合法的JSON格式")
    except KeyError as e:
        raise RuntimeError(f'Token响应格式异常，缺少字段: {str(e)}')


def build_request_param(method: str, path: str, params: dict = None, body: dict = None,
                        app_id: str = "", app_secret: str = "", access_token: str = ""):
    params = params or {}
    params.update({'timestamp': str(int(datetime.now().timestamp() * 1000))})
    sorted_params = "&".join(f"{key}={value}" for key, value in sorted(params.items()))
    body_str = '' if body is None else json.dumps(body)
    body_hash = sha256(body_str.encode('utf-8')).hexdigest()
    str_to_sign = "\n".join([method, path, sorted_params, body_hash])
    signature = hmac.new(app_secret.encode('utf-8'), str_to_sign.encode('utf-8'), digestmod=sha256).hexdigest()

    token = access_token or request_cicc_access_token(app_id, app_secret)
    headers = {
        'Authorization': f'Bearer {token}',
        'X-CICC-Signature': signature,
        'Content-Type': 'application/json',
    }
    return params, headers, body_str


def request_cicc_search_data(method: str, path: str, params: dict = None, body: dict = None, app_id: str = ""
                             , app_secret: str = "", ):
    url = f'{CICC_BASE_API_URL}{path}'
    params, headers, body_str = build_request_param(method, path, params=params, body=body,
                                                    app_id=app_id, app_secret=app_secret)
    response = requests.post(url=url, params=params, headers=headers, data=body_str, timeout=TIMEOUT_SECONDS)
    response.raise_for_status()
    return response.json()


def format_search_results(data_list: List[Dict[str, Any]]) -> str:
    """ 格式化搜索结果为文本内容。"""
    if not data_list:
        return ""

    formatted_lines = []
    for idx, content in enumerate(data_list, 1):
        formatted_lines.append(f"url：{content.get('linkUrl', '')}")
        formatted_lines.append(f"标题：{content.get('documentTitle', '')}")
        formatted_lines.append(f"时间：{content.get('publishTime', '')}")
        formatted_lines.append(f"正文：{content.get('plainContent', '')}")
        formatted_lines.append("")  # 空行分隔

    return "\n".join(formatted_lines)


def fetch_search_data(query: str, app_id: str, app_secret: str) -> List[Dict[str, Any]]:
    response = request_cicc_search_data('POST', API_PATH, params={}, body={'query': query}, app_id=app_id,
                                        app_secret=app_secret)
    if response.get("code") == 403:
        raise Exception(response.get("message", "抱歉，您暂无此内容的权限"))
    elif response.get("code") != 0:
        raise RuntimeError(f'搜索失败: {response.get("message", "未知错误")}')

    return response.get("data", [])


def query_search_data(query: str, app_id: str, app_secret: str, output_dir: Optional[Path] = None,
                      save_to_file: bool = True,
                      ) -> Dict[str, Any]:
    """ 查询中金网页内容并整理统一结果结构。"""
    query = (query or "").strip()
    if not query:
        return {
            "query": "",
            "content": "",
            "output_path": None,
            "raw": [],
            "error": "query is empty",
        }

    out_dir = Path(output_dir or DEFAULT_OUTPUT_DIR)
    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"输出目录已确认：{out_dir.absolute()}")

    result: Dict[str, Any] = {
        "query": query,
        "content": "",
        "output_path": None,
        "raw": [],
    }

    try:
        print(f"开始请求接口，问题：{query[:50]}{'...' if len(query) > 50 else ''}")
        # 获取搜索数据
        raw_data = fetch_search_data(query=query, app_id=app_id, app_secret=app_secret)

        result["raw"] = raw_data

        # 格式化内容
        content = format_search_results(raw_data)
        result["content"] = content

        # 保存到文件
        if save_to_file and content:
            unique_suffix = datetime.now().strftime("%Y%m%d%H%M%S")
            output_path = out_dir / f"cicc_research_article_search_{unique_suffix}.txt"
            print(f"正在保存结果到文件：{output_path.name}")
            output_path.write_text(content, encoding="utf-8")
            result["output_path"] = str(output_path)
            print("文件保存成功！")

    except Exception as exc:
        result["error"] = str(exc)

    return result


def _build_arg_parser() -> argparse.ArgumentParser:
    """ 构建命令行参数解析器。"""
    parser = argparse.ArgumentParser(
        description="Query CICC web content by natural language and optionally save output."
    )
    parser.add_argument("query", nargs="*", help="Natural language query text.")
    parser.add_argument(
        "--app-id",
        default=os.getenv("APP_ID"),
        help="APP ID (也可通过环境变量APP_ID设置)"
    )
    parser.add_argument(
        "--app-secret",
        default=os.getenv("APP_SECRET"),
        help="APP SECRET (也可通过环境变量APP_SECRET设置)"
    )
    parser.add_argument("--no-save", action="store_true", help="Do not write result to local file.")
    return parser


def get_user_input(prompt: str) -> str:
    """通用输入获取函数"""
    while True:
        user_input = input(prompt).strip()
        if user_input:
            return user_input
        print("输入为空，请重新输入！")


def run_cli() -> None:
    """CLI 入口函数"""
    parser = _build_arg_parser()
    args = parser.parse_args()

    query = " ".join(args.query).strip()
    if not query:
        query = get_user_input("请输入你的问题: ")

    # 获取APP_ID/APP_SECRET（命令行/环境变量 -> 交互式输入）
    app_id = args.app_id or get_user_input("请输入APP_ID: ")
    app_secret = args.app_secret or get_user_input("请输入APP_SECRET: ")

    result = query_search_data(
        query=query,
        app_id=app_id,
        app_secret=app_secret,
        save_to_file=not args.no_save
    )
    if result.get("error"):
        print(f"❌ 错误: {result['error']}")
        raise SystemExit(2)

    print("\n" + "=" * 50)
    if result.get("output_path"):
        print(f"✅ 任务完成！结果已保存至：{result['output_path']}")
    print("📝 搜索结果：")
    print(result.get("content", "无有效内容"))
    print("=" * 50)


if __name__ == "__main__":
    run_cli()
