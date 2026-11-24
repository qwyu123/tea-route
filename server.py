#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
茶途智配 · 本地接口服务 v0.1
纯标准库，无第三方依赖。运行：python server.py  →  http://127.0.0.1:8787

端点
  GET  /api/health            健康检查
  GET  /api/channels          渠道能力表
  GET  /api/sample            内置样本订单
  POST /api/plan              传订单，返回归集与分拨方案
  POST /api/parse             传一段乱文本，返回结构化订单

口径与网页演示完全一致：一律按包裹计，快递按包收首重。
"""

import json
import re
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

PORT = 8787
BASE_DIR = Path(__file__).resolve().parent
ORDERS_FILE = BASE_DIR / "orders.json"

# 静态页面（只放白名单，不做目录映射）
STATIC_FILES = {
    "/": "index.html",
    "/index.html": "index.html",
    "/style.css": "style.css",
    "/app.js": "app.js",
    "/order": "order.html",
    "/order.html": "order.html",
    "/order.css": "order.css",
    "/order.js": "order.js",
}
MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
}


def load_orders():
    """已收订单。没有文件就是空列表，不抛异常。"""
    try:
        if ORDERS_FILE.exists():
            data = json.loads(ORDERS_FILE.read_text(encoding="utf-8"))
            return data if isinstance(data, list) else []
    except Exception:
        pass
    return []


def save_orders(orders):
    tmp = ORDERS_FILE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(orders, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(ORDERS_FILE)

# ---------------- 渠道能力表 ----------------
CHANNELS = {
    "zx":  {"name": "春茶专线", "kind": "干线 · 旺季加开", "price": "5.0 元/包裹",
            "lead": "次日达", "limit": "20 包起运 · 单包 ≤30kg",
            "cover": "杭州 / 上海 / 北京 / 广州 四向"},
    "sf":  {"name": "顺丰速运", "kind": "快递 · 时效兜底", "price": "首重 18 元/包，续重 6 元/kg",
            "lead": "次日达", "limit": "单包 ≤30kg", "cover": "全国县域以上"},
    "zt":  {"name": "中通快递", "kind": "快递 · 全国", "price": "首重 8 元/包，续重 3 元/kg",
            "lead": "2 日", "limit": "单包 ≤20kg", "cover": "全国县域以上"},
    "yd":  {"name": "韵达快递", "kind": "快递 · 区域", "price": "首重 7 元/包，续重 2.8 元/kg",
            "lead": "2 日", "limit": "单包 ≤15kg · 仅华东及一线城市",
            "cover": "江浙沪皖、京津、广深"},
    "yz":  {"name": "邮政 EMS", "kind": "快递 · 全覆盖", "price": "首重 12 元/包，续重 4 元/kg",
            "lead": "2–3 日", "limit": "无", "cover": "所有乡镇"},
    "khy": {"name": "客货邮（城乡公交带货）", "kind": "前端 · 集货", "price": "3.5 元/包裹",
            "lead": "一天一趟（9:00 发车）", "limit": "单包 ≤20kg",
            "cover": "村点 ⇄ 县城共配中心"},
}

SELF_DELIVERY = 40.0     # 自有车送县城，一趟
ZX_MIN = 20              # 专线起运量（包）
ZX_HUBS = {"杭州", "上海", "北京", "广州"}
YD_OK = {"杭州", "上海", "南京", "苏州", "宁波", "湖州", "北京", "广州", "深圳", "合肥"}
CITIES = ["杭州", "上海", "北京", "广州", "南京", "苏州", "武汉", "深圳",
          "宁波", "湖州", "合肥", "成都", "西安", "济南"]


# ---------------- 样本订单 ----------------
def _o(oid, cust, city, item, spec, qty, kg, req, pt, src="微信"):
    return {"id": oid, "cust": cust, "city": city, "item": item, "spec": spec,
            "qty": qty, "kg": kg, "req": req, "pt": pt, "src": src}


SAMPLE = [
    _o("CT-241101", "黄杜茶业合作社", "杭州", "安吉白茶 明前特级", "250g×12听", 4, 2.4, "nextday", "溪龙"),
    _o("CT-241102", "宋品茶叶", "杭州", "安吉白茶 精品级礼盒", "200g×6盒", 6, 3.6, "nextday", "溪龙"),
    _o("CT-241103", "极白安吉", "杭州", "安吉白茶 特级", "125g×20袋", 5, 2.0, "nextday", "溪龙", "表格"),
    _o("CT-241104", "大山坞茶业", "杭州", "安吉白茶 一级", "250g×10听", 3, 1.8, "std", "溪龙"),
    _o("CT-241105", "昆铜高山茶场", "杭州", "安吉白茶 特级", "250g", 2, 1.1, "std", "昆铜", "电话"),
    _o("CT-241106", "芳羽茶叶", "杭州", "安吉白茶 明前一级", "250g", 3, 1.5, "std", "昆铜", "表格"),
    _o("CT-241107", "天荒坪云雾茶", "杭州", "安吉白茶 精品级", "100g", 1, 0.5, "nextday", "天荒坪"),
    _o("CT-241108", "孝丰老街茶行", "杭州", "安吉白茶 一级", "250g", 2, 1.2, "std", "天荒坪"),
    _o("CT-241109", "黄杜茶业合作社", "上海", "安吉白茶 明前特级", "250g×20听", 8, 4.8, "nextday", "溪龙"),
    _o("CT-241110", "宋品茶叶", "上海", "安吉白茶 精品级礼盒", "200g×8盒", 4, 3.2, "nextday", "溪龙"),
    _o("CT-241111", "极白安吉", "上海", "安吉白茶 特级", "125g×24袋", 5, 2.4, "nextday", "溪龙", "表格"),
    _o("CT-241112", "大山坞茶业", "上海", "安吉白茶 一级", "250g", 2, 1.2, "std", "溪龙"),
    _o("CT-241113", "昆铜高山茶场", "上海", "安吉白茶 特级", "100g", 1, 0.5, "std", "昆铜", "电话"),
    _o("CT-241114", "芳羽茶叶", "上海", "安吉白茶 一级", "250g", 1, 0.6, "std", "昆铜"),
    _o("CT-241115", "黄杜茶业合作社", "北京", "安吉白茶 明前特级", "250g×4听", 4, 2.4, "nextday", "溪龙"),
    _o("CT-241116", "宋品茶叶", "北京", "安吉白茶 精品级礼盒", "200g×2盒", 2, 1.6, "nextday", "溪龙"),
    _o("CT-241117", "极白安吉", "北京", "安吉白茶 特级", "125g×2袋", 2, 1.1, "std", "溪龙", "表格"),
    _o("CT-241118", "大山坞茶业", "北京", "安吉白茶 一级", "100g", 1, 0.5, "std", "溪龙"),
    _o("CT-241119", "黄杜茶业合作社", "广州", "安吉白茶 特级", "250g×3听", 3, 1.8, "nextday", "溪龙"),
    _o("CT-241120", "宋品茶叶", "广州", "安吉白茶 精品级礼盒", "200g×2盒", 2, 1.2, "std", "溪龙"),
    _o("CT-241121", "极白安吉", "广州", "安吉白茶 一级", "100g", 1, 0.5, "std", "溪龙", "表格"),
    _o("CT-241122", "孝丰老街茶行", "南京", "安吉白茶 一级", "250g", 2, 1.2, "std", "天荒坪"),
    _o("CT-241123", "上墅白茶园", "苏州", "安吉白茶 特级", "125g", 2, 1.0, "std", "天荒坪", "表格"),
    _o("CT-241124", "杭垓竹乡茶社", "武汉", "安吉白茶 一级", "250g", 1, 0.7, "std", "昆铜", "电话"),
]


# ---------------- 计价 ----------------
def cost_of(ch, qty, weight):
    """按包裹计费；快递首重 + 续重（按平均包重）。"""
    if qty <= 0:
        return 0.0
    w = weight / qty
    over = max(0.0, w - 1.0)
    table = {"zx": (5.0, 0.0), "sf": (18.0, 6.0), "zt": (8.0, 3.0),
             "yd": (7.0, 2.8), "yz": (12.0, 4.0), "khy": (3.5, 0.0)}
    first, add = table[ch]
    return round(qty * (first + over * add), 2)


def _baseline_key(o):
    if o["req"] == "nextday":
        return "sf"
    return "yd" if o["city"] in YD_OK else "zt"


def build_plan(orders):
    # 一、前端集货
    pts = {}
    for o in orders:
        p = pts.setdefault(o["pt"], {"pt": o["pt"], "n": 0, "qty": 0, "kg": 0.0})
        p["n"] += 1
        p["qty"] += o["qty"]
        p["kg"] += o["kg"]

    collect = []
    for p in sorted(pts.values(), key=lambda x: -x["qty"]):
        khy = cost_of("khy", p["qty"], p["kg"])
        use_khy = khy < SELF_DELIVERY
        cost = khy if use_khy else SELF_DELIVERY
        collect.append({
            "point": p["pt"], "orders": p["n"], "qty": p["qty"],
            "kg": round(p["kg"], 1),
            "mode": "khy" if use_khy else "self",
            "mode_name": "客货邮带货" if use_khy else "自有车送县城",
            "cost": round(cost, 2),
            "saving_vs_alone": round(SELF_DELIVERY - cost, 2),
        })
    collect_cost = round(sum(c["cost"] for c in collect), 2)
    collect_base = SELF_DELIVERY * len(collect)

    # 二、干线分拨
    by_city = {}
    for o in orders:
        by_city.setdefault(o["city"], []).append(o)

    lines = []
    for city, lst in by_city.items():
        qty = sum(o["qty"] for o in lst)
        kg = round(sum(o["kg"] for o in lst), 2)
        nd = [o for o in lst if o["req"] == "nextday"]
        std = [o for o in lst if o["req"] != "nextday"]
        nd_qty = sum(o["qty"] for o in nd)
        std_qty = sum(o["qty"] for o in std)
        nd_kg = sum(o["kg"] for o in nd)
        std_kg = sum(o["kg"] for o in std)

        base_cost = round(sum(cost_of(_baseline_key(o), o["qty"], o["kg"]) for o in lst), 2)

        if city in ZX_HUBS and qty >= ZX_MIN:
            cost = cost_of("zx", qty, kg)
            lines.append({
                "city": city, "qty": qty, "weight_kg": kg, "orders": len(lst),
                "channel": "zx", "channel_name": "春茶专线",
                "cost": cost, "lead": "次日达", "upgraded": True, "batches": 1,
                "baseline_cost": base_cost,
                "reasons": [
                    {"type": "ok", "label": "起运量", "text": f"本批 {qty} 包，达到专线 {ZX_MIN} 包起运门槛"},
                    {"type": "ok", "label": "成本", "text": f"专线 {cost} 元，比逐件发快递省 {round(base_cost - cost, 2)} 元"},
                    {"type": "ok", "label": "时效", "text": f"次日达，同时满足 {nd_qty} 包次日件与 {std_qty} 包普通件"},
                ],
            })
        else:
            parts = []
            cost = 0.0
            if nd_qty:
                c = cost_of("sf", nd_qty, nd_kg)
                cost += c
                parts.append({"channel": "sf", "channel_name": "顺丰速运", "qty": nd_qty, "cost": c})
            if std_qty:
                key = "yd" if city in YD_OK else "zt"
                c = cost_of(key, std_qty, std_kg)
                cost += c
                parts.append({"channel": key, "channel_name": CHANNELS[key]["name"],
                              "qty": std_qty, "cost": c})
            cost = round(cost, 2)
            gap = ZX_MIN - qty
            if city in ZX_HUBS:
                r0 = {"type": "no", "label": "起运量",
                      "text": f"本批 {qty} 包，差 {gap} 包才够专线起运，本次只能降级发快递"}
                tip = f"若明日有同向件可并入，凑满 {ZX_MIN} 包即可改发专线；等待成本需人工权衡"
            else:
                r0 = {"type": "no", "label": "航道", "text": f"{city} 不在春茶专线四向范围内，只能走快递"}
                tip = "该方向无专线，成本优化只能靠同城合批"
            reasons = [r0]
            reasons += [{"type": "ok", "label": "分配",
                         "text": f"{p['qty']} 包走 {p['channel_name']}，{p['cost']} 元"} for p in parts]
            reasons.append({"type": "ok", "label": "提示", "text": tip})
            lines.append({
                "city": city, "qty": qty, "weight_kg": kg, "orders": len(lst),
                "channel": "+".join(p["channel"] for p in parts),
                "channel_name": " + ".join(p["channel_name"] for p in parts),
                "cost": cost, "lead": "次日 / 2 日", "upgraded": False,
                "batches": max(1, len(parts)), "baseline_cost": base_cost,
                "gap_to_zx": gap if city in ZX_HUBS else None,
                "parts": parts, "reasons": reasons,
            })

    lines.sort(key=lambda x: -x["cost"])

    freight = round(sum(l["cost"] for l in lines), 2)
    base_freight = round(sum(l["baseline_cost"] for l in lines), 2)
    total = round(freight + collect_cost, 2)
    base_total = round(base_freight + collect_base, 2)

    return {
        "orders": len(orders),
        "parcels": sum(o["qty"] for o in orders),
        "weight_kg": round(sum(o["kg"] for o in orders), 1),
        "collect": collect,
        "collect_cost": collect_cost,
        "collect_baseline": round(collect_base, 2),
        "lines": lines,
        "freight": freight,
        "freight_baseline": base_freight,
        "batches": sum(l["batches"] for l in lines),
        "total_cost": total,
        "baseline_cost": base_total,
        "saving": round(base_total - total, 2),
        "saving_pct": round((base_total - total) / base_total * 100, 1) if base_total else 0,
        "minutes_new": 33,
        "minutes_baseline": 118,
        "caveat": "样本为构造的演示数据；实际须以春茶季前的询价与脱敏订单为准。",
    }


# ---------------- 文本识别（规则版） ----------------
GRADE_KW = ["明前特级", "明前一级", "特级", "精品级", "一级", "二级"]
POINT_KW = ["溪龙", "昆铜", "天荒坪", "上墅", "孝丰", "杭垓", "报福", "鄣吴", "梅溪", "天子湖"]
# 简称 → 全称；长的放前面，避免被短词抢走
CUST_ALIAS = [
    ("黄杜", "黄杜茶业合作社"), ("宋品", "宋品茶叶"), ("极白", "极白安吉"),
    ("大山坞", "大山坞茶业"), ("昆铜高山", "昆铜高山茶场"), ("昆铜", "昆铜高山茶场"),
    ("芳羽", "芳羽茶叶"), ("天荒坪云雾", "天荒坪云雾茶"), ("天荒坪", "天荒坪云雾茶"),
    ("孝丰老街", "孝丰老街茶行"), ("上墅", "上墅白茶园"), ("杭垓竹乡", "杭垓竹乡茶社"),
]
# 否定优先于肯定：「不着急」里也有「急」
NEG_RE = re.compile("不着急|不急|不用急|随便|常规|能省就省|不赶")
POS_RE = re.compile("加急|明天|次日|急要|尽快|赶一趟")
QTY_RE = re.compile(r"(\d+)\s*(?:件|听|盒|袋|包|个|箱)")
KG_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:kg|公斤|千克)")
CITY_RE = re.compile("|".join(CITIES))


def parse_text(text):
    """把一段口语化的订单描述拆成结构化订单。规则版，不调模型。"""
    out = []
    for raw in re.split(r"[\n；;]+", text):
        line = raw.strip()
        if not line:
            continue
        city = CITY_RE.search(line)
        qty = QTY_RE.search(line)
        if not city or not qty:
            continue
        grade = next((g for g in GRADE_KW if g in line), "一级")
        cust = next((full for short, full in CUST_ALIAS if short in line), "未识别客户")
        pt = next((p for p in POINT_KW if p in line), "溪龙")
        kgm = KG_RE.search(line)
        q = int(qty.group(1))
        weight = float(kgm.group(1)) if kgm else round(q * 0.6, 1)
        if NEG_RE.search(line):
            req = "std"
        elif POS_RE.search(line):
            req = "nextday"
        else:
            req = "std"
        out.append({
            "id": f"CT-{len(out) + 1:04d}",
            "cust": cust,
            "city": city.group(0),
            "item": f"安吉白茶 {grade}",
            "spec": qty.group(0),
            "qty": q,
            "kg": weight,
            "req": req,
            "pt": pt,
            "src": "api",
            "raw": line,
            "inferred": [k for k, v in
                         (("cust", cust == "未识别客户"), ("kg", kgm is None)) if v],
        })
    return out


# ---------------- HTTP ----------------
class Handler(BaseHTTPRequestHandler):
    server_version = "TeaRoute/0.1"

    def _send(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if not n:
            return {}
        try:
            return json.loads(self.rfile.read(n).decode("utf-8"))
        except json.JSONDecodeError:
            return None

    def do_OPTIONS(self):
        self._send({}, 204)

    def _serve_static(self, rel):
        path = BASE_DIR / rel
        if not path.exists() or not path.is_file():
            self._send({"error": "not found", "file": rel}, 404)
            return
        body = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", MIME.get(path.suffix, "application/octet-stream"))
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urlparse(self.path).path
        if path in STATIC_FILES:
            self._serve_static(STATIC_FILES[path])
        elif path == "/api/health":
            self._send({"ok": True, "service": "茶途智配接口", "version": "0.2",
                        "received_orders": len(load_orders()),
                        "endpoints": ["GET /api/channels", "GET /api/sample", "GET /api/orders",
                                      "POST /api/order", "POST /api/plan", "POST /api/parse"]})
        elif path == "/api/channels":
            self._send({"channels": CHANNELS, "self_delivery": SELF_DELIVERY,
                        "express_line_min_parcels": ZX_MIN, "express_line_hubs": sorted(ZX_HUBS)})
        elif path == "/api/sample":
            self._send({"orders": SAMPLE, "count": len(SAMPLE)})
        elif path == "/api/orders":
            got = load_orders()
            self._send({"orders": got, "count": len(got)})
        else:
            self._send({"error": "not found", "path": path}, 404)

    def _accept_order(self, data):
        """客户从下单页提交的一张单。校验必填、落盘、回订单号。"""
        city = str(data.get("city") or "").strip()
        qty = data.get("qty")
        try:
            qty = int(qty)
        except (TypeError, ValueError):
            qty = 0
        if not city or qty <= 0:
            self._send({"ok": False, "error": "收货城市和包裹数必填（包裹数需大于 0）"}, 400)
            return

        try:
            kg = float(data.get("kg") or 0)
        except (TypeError, ValueError):
            kg = 0.0
        inferred = []
        if kg <= 0:
            kg = round(qty * 0.6, 1)     # 没填重量：按每包 0.6kg 估，并标明
            inferred.append("kg")

        req = "nextday" if data.get("req") == "nextday" else "std"
        grade = str(data.get("grade") or "一级").strip()
        existing = load_orders()
        order = {
            "id": f"CT-{datetime.now():%y%m%d}-{len(existing) + 1:03d}",
            "cust": str(data.get("cust") or "未填写客户").strip(),
            "city": city,
            "item": f"安吉白茶 {grade}",
            "spec": str(data.get("spec") or "").strip() or f"{qty} 包",
            "qty": qty,
            "kg": kg,
            "req": req,
            "pt": str(data.get("pt") or "溪龙").strip(),
            "src": "网页",
            "note": str(data.get("note") or "").strip(),
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
        if inferred:
            order["inferred"] = inferred
        existing.append(order)
        save_orders(existing)
        self._send({"ok": True, "order": order, "total_orders": len(existing)})

    def do_POST(self):
        path = urlparse(self.path).path
        data = self._body()
        if data is None:
            self._send({"error": "invalid json"}, 400)
            return

        if path == "/api/order":
            self._accept_order(data)
        elif path == "/api/plan":
            orders = data.get("orders") or load_orders() or SAMPLE
            bad = [o for o in orders if not all(k in o for k in ("city", "qty", "kg"))]
            if bad:
                self._send({"error": "订单缺少 city / qty / kg 字段", "count": len(bad)}, 400)
                return
            for o in orders:
                o.setdefault("req", "std")
                o.setdefault("pt", "溪龙")
            self._send(build_plan(orders))
        elif path == "/api/parse":
            text = (data or {}).get("text", "")
            if not text.strip():
                self._send({"error": "text 为空"}, 400)
                return
            parsed = parse_text(text)
            self._send({"parsed": parsed, "count": len(parsed)})
        else:
            self._send({"error": "not found", "path": path}, 404)

    def log_message(self, fmt, *args):
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))


if __name__ == "__main__":
    print("茶途智配接口已启动： http://127.0.0.1:%d" % PORT)
    print("  GET  /api/health  /api/channels  /api/sample")
    print("  POST /api/plan    /api/parse")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
