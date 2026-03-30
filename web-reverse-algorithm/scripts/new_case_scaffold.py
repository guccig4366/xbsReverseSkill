#!/usr/bin/env python3
"""Create a structured case scaffold for Web reverse pure-calc research."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


CASE_TYPES = {
    "sign": {
        "title": "标准签名 / Header 纯算",
        "goal": "从最终请求倒推 builder，恢复原始串并本地复现。",
        "fields": ["url", "method", "target_field", "raw_string", "token_sources"],
        "risks": [
            "重点核对 query/json/path 的规范化方式。",
            "固定时间戳、token、cookie、UA 后再比最终值。",
            "不要把标准算法问题误判成环境问题。",
        ],
    },
    "mixed": {
        "title": "混合加密 / 密钥包装",
        "goal": "分离业务明文、对称层、非对称包装层，再本地复现。",
        "fields": ["url", "method", "target_fields", "plaintext", "encrypted_layers"],
        "risks": [
            "不要把业务密文和密钥包装混成一个 sign。",
            "分别保存每层输入输出，不只比较最终值。",
            "优先确认 key/iv/public key 的真实来源。",
        ],
    },
    "cookie": {
        "title": "Cookie / 会话值纯算",
        "goal": "从 document.cookie 写入点回溯 builder 与环境采集链。",
        "fields": ["writer", "target_cookie", "upstream_sources", "raw_payload", "final_cookie"],
        "risks": [
            "区分初始化 cookie 和业务 cookie。",
            "优先 hook sink，不要只盯网络请求。",
            "先证明哪些环境值是真校验项。",
        ],
    },
    "jsvmp": {
        "title": "JSVMP / VMP 纯算",
        "goal": "从最终 writer 倒推中间数组或 payload，再恢复最终编码层。",
        "fields": ["url", "method", "target_field", "entry", "builder", "state_objects"],
        "risks": [
            "不要从文件头正推整个 VM。",
            "先做低风险 AST 降噪，再做 hook / logpoint。",
            "中间数组和随机数/时间戳检查点要先固定。",
        ],
    },
    "captcha": {
        "title": "验证码 / Challenge / Verify",
        "goal": "拆 challenge、图像、参数、环境、verify 五条线，并收敛成 solver。",
        "fields": ["init_url", "image_url", "verify_url", "target_fields", "recognition_result"],
        "risks": [
            "不要把图像线和参数线混写。",
            "先确认真正失败的是 verify 哪个字段。",
            "collect、w、fs、pow_answer 一类字段要单独建检查点。",
        ],
    },
    "wasm": {
        "title": "Wasm / 协议纯算",
        "goal": "先证明输入输出边界，再决定是否反编译或直接改写。",
        "fields": ["loader", "exported_functions", "target_field", "protocol_frames", "io_samples"],
        "risks": [
            "先看导出函数和包段，不要一上来全量反编译。",
            "协议题先数包，再拆首包和验证包。",
            "保留 Wasm / protobuf / WS 的输入输出样本。",
        ],
    },
}

FAMILY_HINTS = {
    "generic": ["按题型模板拆 writer / builder / entry / source。"],
    "xhs": ["重点记录 window._webmsxyw、x1/x2/x3/x4、payload、X-S-Common。"],
    "douyin": ["重点记录双 SM3、41/50/96/128/136 位数组、最终编码层。"],
    "tencent": ["重点记录 prehandle、pow_answer、pow_calc_time、collect、track、verify。"],
    "geetest": ["区分三代和四代，分别记录 h/u 或 captcha_id/challenge/load 对象。"],
    "netease-shield": ["重点记录 validateCodeObj、userAnswer、P1~P9、w。"],
    "taobao": ["重点记录 token、t、appKey、紧凑 JSON data。"],
    "youdao": ["同时记录请求 sign 与响应 AES-CBC 解密链。"],
    "baidu": ["区分 token、固定 seed 与 sign 函数。"],
    "cloudflare": ["拆 challenge 阶段、fingerprint 层、计算层。"],
}

OVERVIEW_TEMPLATE = """# {title}

## 案例目标

- 案例名：`{case_name}`
- 题型：`{case_type}`
- 站点家族：`{family}`
- 目标：{goal}
- 目标字段：
- 最终成功条件：

## 入口判断

- 最终请求 / 最终 sink：
- writer：
- builder：
- entry：
- source：

## 当前阻塞点

- 入口没找对 / 原始串没对齐 / 中间态没采到 / 环境没补齐 / 图像线没拆开 / 协议边界没证明：

## 家族提示

{family_lines}

## 风险点

{risk_lines}
"""

REQUEST_CHAIN_TEMPLATE = """# 请求链

## 闭环

```text
source
-> entry
-> builder
-> writer
-> final output
```

## 请求或写出顺序

1. 初始化 / 页面态：
2. 中间参数生成：
3. 最终请求 / verify / cookie / WS：

## 目标字段

- 字段名：
- 位置：header / body / cookie / payload / ws
- 当前样本值：

## 必要输入集合

- token / cookie：
- 时间戳 / 随机数：
- 页面态参数 / load 返回对象：
- 图像识别结果 / 轨迹：
- 环境值 / 指纹值：
"""

EVIDENCE_TEMPLATE = """# 证据日志

## 浏览器检查点

1. writer 检查点：
2. builder 输入：
3. 原始串 / payload：
4. 中间数组 / 中间对象：
5. 最终输出：

## 本地检查点

1. writer 检查点：
2. builder 输入：
3. 原始串 / payload：
4. 中间数组 / 中间对象：
5. 最终输出：

## 差异定位

- 从哪一步开始分叉：
- 猜测原因：
- 下一步验证：
"""

TODO_TEMPLATE = """# TODO

- [ ] 抓成功样本并保存最终请求或最终 sink
- [ ] 标出 writer / builder / entry / source
- [ ] 固定时间戳、随机数、cookie、token 等不稳定输入
- [ ] 保存浏览器端检查点
- [ ] 保存本地端检查点
- [ ] 比对差异并收敛到最小可复现函数
- [ ] 记录易错点和版本风险
"""

SOLVER_JS = """// {title}
// 最小本地复现骨架。建议把 context、payload、crypto/vm、validate 分层。

function buildContext() {{
  return {{
    source: {{}},
    unstableInputs: {{}},
  }};
}}

function buildPayload(ctx) {{
  return {{
    ctx,
    raw: null,
    intermediate: [],
  }};
}}

function solve(ctx = buildContext()) {{
  const payload = buildPayload(ctx);
  return {{
    ctx,
    payload,
    finalOutput: null,
    checkpoints: {{
      writer: null,
      builderInput: null,
      raw: null,
      intermediate: [],
      final: null,
    }},
  }};
}}

module.exports = {{
  buildContext,
  buildPayload,
  solve,
}};
"""

SOLVER_PY = """# {title}
# 最小本地复现骨架。建议把 context、payload、crypto/vm、validate 分层。


def build_context():
    return {{
        "source": {{}},
        "unstable_inputs": {{}},
    }}


def build_payload(ctx):
    return {{
        "ctx": ctx,
        "raw": None,
        "intermediate": [],
    }}


def solve(ctx=None):
    if ctx is None:
        ctx = build_context()
    payload = build_payload(ctx)
    return {{
        "ctx": ctx,
        "payload": payload,
        "final_output": None,
        "checkpoints": {{
            "writer": None,
            "builder_input": None,
            "raw": None,
            "intermediate": [],
            "final": None,
        }},
    }}
"""


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9\u4e00-\u9fff._-]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value or "case"


def parse_csv(text: str) -> list[str]:
    if not text:
        return []
    return [item.strip() for item in text.split(",") if item.strip()]


def checkpoints_for(case_type: str) -> dict:
    return {
        "meta": {
            "case_type": case_type,
            "target_fields": [],
        },
        "browser": {
            "writer": None,
            "builder_input": None,
            "raw": None,
            "intermediate": [],
            "final": None,
        },
        "local": {
            "writer": None,
            "builder_input": None,
            "raw": None,
            "intermediate": [],
            "final": None,
        },
        "field_hints": CASE_TYPES[case_type]["fields"],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a structured case scaffold for Web reverse pure-calc tasks.")
    parser.add_argument("case_name", help="Case name shown in generated files.")
    parser.add_argument("--type", choices=sorted(CASE_TYPES), required=True, help="Case type.")
    parser.add_argument("--family", default="generic", help="Site family such as xhs, douyin, tencent, geetest.")
    parser.add_argument("--tags", default="", help="Comma-separated tags.")
    parser.add_argument("--sources", default="", help="Comma-separated source URLs.")
    parser.add_argument("--language", choices=["js", "py"], default="js", help="Solver stub language.")
    parser.add_argument("--output", required=True, help="Directory where the case folder will be created.")
    args = parser.parse_args()

    case_slug = slugify(args.case_name)
    base_dir = Path(args.output).expanduser().resolve() / case_slug
    base_dir.mkdir(parents=True, exist_ok=True)

    case_type = CASE_TYPES[args.type]
    family_hints = FAMILY_HINTS.get(args.family, FAMILY_HINTS["generic"])
    family_lines = "\n".join(f"- {line}" for line in family_hints)
    risk_lines = "\n".join(f"- {line}" for line in case_type["risks"])

    metadata = {
        "case_name": args.case_name,
        "case_slug": case_slug,
        "case_type": args.type,
        "family": args.family,
        "tags": parse_csv(args.tags),
        "sources": parse_csv(args.sources),
        "solver_language": args.language,
    }

    (base_dir / "case-overview.md").write_text(
        OVERVIEW_TEMPLATE.format(
            title=case_type["title"],
            case_name=args.case_name,
            case_type=args.type,
            family=args.family,
            goal=case_type["goal"],
            family_lines=family_lines,
            risk_lines=risk_lines,
        ),
        encoding="utf-8",
    )
    (base_dir / "request-chain.md").write_text(REQUEST_CHAIN_TEMPLATE, encoding="utf-8")
    (base_dir / "evidence-log.md").write_text(EVIDENCE_TEMPLATE, encoding="utf-8")
    (base_dir / "todo.md").write_text(TODO_TEMPLATE, encoding="utf-8")
    (base_dir / "metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (base_dir / "checkpoints.json").write_text(
        json.dumps(checkpoints_for(args.type), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    solver_name = f"solver_stub.{args.language}"
    solver_content = SOLVER_JS if args.language == "js" else SOLVER_PY
    (base_dir / solver_name).write_text(solver_content.format(title=case_type["title"]), encoding="utf-8")

    print(f"[OK] Created scaffold: {base_dir}")
    print("[OK] Files: case-overview.md, request-chain.md, evidence-log.md, checkpoints.json, metadata.json, todo.md")
    print(f"[OK] Solver stub: {solver_name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())