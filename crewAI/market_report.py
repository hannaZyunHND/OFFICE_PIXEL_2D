"""Market report page in the v1 dashboard look. Numbers stay on their own layer."""

from __future__ import annotations

import html
import json
from pathlib import Path
from typing import Any, Dict, List

_FLOOR = {"shopee": "🟠 Sàn Cam", "lazada": "🔵 Sàn Xanh", "tiktok_shop": "⚫ Sàn Đen"}
_PAGE = 10

_CSS = """
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin:0; font-family: Inter, Segoe UI, system-ui, sans-serif; background:#020617; color:#e2e8f0; line-height:1.5; }
.wrap { max-width:1320px; margin:0 auto; padding:20px; }
.hero { background:linear-gradient(135deg,#0f172a,#1e293b); border:1px solid #334155; border-radius:14px; padding:18px 22px; margin-bottom:14px; }
.pill { display:inline-block; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:700; background:rgba(56,189,248,.15); color:#38bdf8; border:1px solid rgba(56,189,248,.4); }
.hero h1 { margin:6px 0 8px; font-size:22px; color:#f8fafc; }
.hero-narrative { margin:0; font-size:13.5px; color:#cbd5e1; white-space:pre-wrap; }
.tabs-bar { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px; position:sticky; top:0; z-index:10; background:rgba(2,6,23,.92); backdrop-filter:blur(6px); padding:8px 0; }
.tab-btn { padding:8px 14px; border-radius:10px; border:1px solid #334155; background:#0f172a; color:#94a3b8; font-weight:700; font-size:13px; cursor:pointer; }
.tab-btn:hover { color:#f8fafc; border-color:#475569; }
.tab-btn.active { background:#1e293b; color:#38bdf8; border-color:#38bdf8; box-shadow:0 0 0 1px rgba(56,189,248,.35); }
.sa-panel { background:#0f172a; border:1px solid #334155; border-radius:14px; padding:18px; margin-bottom:14px; }
.sa-sub { font-size:12px; color:#94a3b8; }
.sa-title { margin:2px 0 8px; font-size:18px; color:#f8fafc; display:flex; align-items:center; gap:8px; }
.sa-hint { font-size:12px; color:#64748b; margin:0 0 12px; }
.banner { background:rgba(245,158,11,.1); border:1px solid rgba(245,158,11,.45); color:#fde68a; border-radius:10px; padding:8px 10px; font-size:12.5px; margin:0 0 12px; }
.alert-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px; margin-bottom:14px; }
.alert-card { padding:10px 12px; border-radius:10px; background:#020617; border:1px solid #334155; }
.alert-card.warn { border-color:rgba(245,158,11,.45); background:rgba(245,158,11,.06); }
.alert-card.ok { border-color:rgba(34,197,94,.45); background:rgba(34,197,94,.06); }
.alert-card.info { border-color:rgba(56,189,248,.45); background:rgba(56,189,248,.06); }
.alert-title { font-size:12px; font-weight:700; color:#f8fafc; display:flex; align-items:center; gap:6px; }
.alert-desc { font-size:11.5px; color:#94a3b8; margin-top:2px; }
.overview-split { display:grid; grid-template-columns:270px 1fr; gap:14px; }
@media (max-width:860px) {
  .overview-split { grid-template-columns:1fr; }
  .kpi-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .bin-row { grid-template-columns:1fr; }
  .bin-lbl { white-space:normal; }
}
.blue-ocean-card { background:#020617; border:1px solid rgba(245,158,11,.45); border-radius:12px; padding:16px; }
.bo-caption { font-size:12.5px; font-weight:700; color:#cbd5e1; display:flex; align-items:center; gap:6px; }
.bo-num { font-size:40px; font-weight:800; line-height:1; }
.bo-den { font-size:15px; color:#94a3b8; font-weight:700; }
.bo-badge { display:inline-block; margin-top:8px; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:800; }
.bo-track { height:8px; background:#1e293b; border-radius:999px; overflow:hidden; margin:10px 0; }
.bo-fill { height:100%; border-radius:999px; }
.bo-note { margin:0; font-size:11.5px; color:#94a3b8; }
.kpi-panel { background:#020617; border:1px solid #334155; border-radius:12px; padding:14px; }
.kpi-panel-head { font-size:12.5px; font-weight:700; color:#cbd5e1; margin-bottom:10px; }
.kpi-grid { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:10px; }
.kpi-box { background:#0f172a; border:1px solid #1e293b; border-radius:9px; padding:10px 12px; min-width:0; }
.kpi-lbl { font-size:11px; color:#94a3b8; display:flex; align-items:center; gap:5px; }
.help-wrap { position:relative; display:inline-flex; flex:none; }
.help { width:15px; height:15px; border-radius:50%; border:1px solid #64748b; background:#020617; color:#e2e8f0; font-size:10px; font-weight:800; line-height:1; padding:0; cursor:pointer; }
.help:hover, .help-wrap.open .help, .help-wrap:focus-within .help { border-color:#38bdf8; color:#7dd3fc; }
.help-pop { display:none; position:fixed; z-index:80; width:280px; text-align:left; }
.help-wrap.show .help-pop, .help-wrap:focus-within .help-pop, .help-wrap.open .help-pop { display:block; }
.help-card { display:block; background:#0f172a; border:1px solid #38bdf8; border-radius:10px; padding:10px 12px; color:#e2e8f0; font-size:12px; font-weight:500; line-height:1.45; letter-spacing:0; text-transform:none; box-shadow:0 16px 40px rgba(0,0,0,.72); }
.help-card b { display:block; margin:7px 0 1px; color:#7dd3fc; font-size:10px; letter-spacing:.04em; text-transform:uppercase; }
.help-card b:first-child { margin-top:0; }
.kpi-val { font-size:15px; font-weight:800; margin-top:4px; color:#f8fafc; white-space:nowrap; font-variant-numeric:tabular-nums; }
.kpi-range { display:flex; flex-direction:column; gap:1px; font-size:13px; line-height:1.25; }
.kpi-val.blue { color:#38bdf8; } .kpi-val.purple { color:#c084fc; } .kpi-val.amber { color:#fbbf24; } .kpi-val.green { color:#4ade80; }
.table-toolbar { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:10px; margin-bottom:10px; }
.filter-controls, .pager { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
.ctrl-input, .ctrl-select, .ctrl-btn { background:#020617; border:1px solid #334155; color:#f8fafc; border-radius:8px; padding:6px 10px; font-size:12px; }
.ctrl-btn { cursor:pointer; background:#1e293b; font-weight:700; }
.ctrl-btn:hover { border-color:#38bdf8; color:#38bdf8; }
.page-label { font-size:12px; color:#94a3b8; }
.tbl-wrap { overflow:auto; border:1px solid #1e293b; border-radius:10px; }
table { width:max-content; min-width:100%; border-collapse:collapse; font-size:12px; }
th, td { text-align:left; padding:8px 10px; border-bottom:1px solid #1e293b; vertical-align:middle; white-space:nowrap; }
.sku td:nth-child(2) { white-space:normal; min-width:280px; max-width:420px; }
th { background:#020617; color:#94a3b8; font-size:10.5px; text-transform:uppercase; position:sticky; top:0; }
a { color:#38bdf8; text-decoration:none; } a:hover { text-decoration:underline; }
img.thumb { width:44px; height:44px; object-fit:cover; border-radius:8px; background:#1e293b; }
.no-photo { color:#64748b; font-size:11px; }
.name { font-weight:700; color:#f8fafc; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.meta { color:#94a3b8; font-size:11px; margin-top:2px; }
.grid2 { display:grid; grid-template-columns:repeat(auto-fit,minmax(360px,1fr)); gap:14px; }
.bin-row { display:grid; grid-template-columns:minmax(220px,280px) minmax(160px,1fr) auto; align-items:center; gap:10px; padding:8px 10px; border-radius:8px; margin-bottom:6px; background:#020617; border:1px solid #1e293b; }
.bin-row.sweet { border-color:rgba(16,185,129,.6); background:rgba(16,185,129,.08); }
.sweet-tag { font-size:9.5px; background:#10b981; color:#020617; font-weight:800; padding:1px 5px; border-radius:4px; margin-left:4px; }
.bin-lbl { font-size:11.5px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.bin-line { display:flex; align-items:center; gap:8px; margin:3px 0; }
.mini-tag { width:92px; font-size:10px; color:#94a3b8; flex:none; }
.mini-track { flex:1; height:8px; background:#1e293b; border-radius:999px; overflow:hidden; }
.mini-fill { height:100%; border-radius:999px; }
.mini-fill.blue { background:#38bdf8; } .mini-fill.green { background:#10b981; } .mini-fill.amber { background:#fbbf24; }
.bin-val { text-align:right; font-size:12px; font-weight:700; white-space:nowrap; min-width:88px; font-variant-numeric:tabular-nums; }
.share-pill { padding:2px 7px; border-radius:999px; background:#1e293b; color:#38bdf8; font-weight:800; font-size:11px; }
.mall-pill { font-size:9.5px; background:#ef4444; color:#fff; padding:1px 4px; border-radius:3px; margin-left:4px; font-weight:800; }
.mode-badge { font-size:10px; font-family:ui-monospace,monospace; padding:2px 6px; border-radius:4px; font-weight:800; }
.mode-badge.live { background:rgba(34,197,94,.2); color:#4ade80; border:1px solid rgba(34,197,94,.5); }
.mode-badge.sandbox { background:rgba(245,158,11,.2); color:#fbbf24; border:1px solid rgba(245,158,11,.5); }
"""

_JS = """
var PAGE = 10;
var state = {};
function st(tab) {
  if (!state[tab]) state[tab] = { q: '', shop: 'all', page: 1, sort: 'gmvN', dir: -1 };
  return state[tab];
}
var SKU = {};
function loadSku() {
  document.querySelectorAll('script.sku-data').forEach(function(node) {
    var tab = node.getAttribute('data-tab');
    try { SKU[tab] = JSON.parse(node.textContent || '[]'); }
    catch (err) { SKU[tab] = []; }
  });
}
function visibleRows(tab) {
  var s = st(tab);
  var shown = (SKU[tab] || []).filter(function(row) {
    if (s.q && String(row.q || '').indexOf(s.q) === -1) return false;
    if (s.shop === 'mall' && !row.mall) return false;
    if (s.shop === 'nogift' && row.gift) return false;
    return true;
  });
  if (s.sort) {
    shown.sort(function(a, b) {
      return ((Number(a[s.sort]) || 0) - (Number(b[s.sort]) || 0)) * s.dir;
    });
  }
  return shown;
}
function skuText(value) {
  var td = document.createElement('td');
  td.textContent = value == null || value === '' ? '—' : String(value);
  return td;
}
function skuLink(href, label) {
  if (!href) return document.createTextNode(label || '—');
  var link = document.createElement('a');
  link.href = href;
  link.textContent = label || href;
  return link;
}
function renderSkuRow(row) {
  var tr = document.createElement('tr');
  var photo = document.createElement('td');
  if (row.image) {
    var img = document.createElement('img');
    img.className = 'thumb';
    img.alt = '';
    img.referrerPolicy = 'no-referrer';
    img.loading = 'lazy';
    img.src = row.image;
    photo.appendChild(img);
  } else {
    var empty = document.createElement('span');
    empty.className = 'no-photo';
    empty.textContent = 'Không ảnh';
    photo.appendChild(empty);
  }
  var name = document.createElement('td');
  var title = document.createElement('div');
  title.className = 'name';
  title.appendChild(skuLink(row.url, row.title || '—'));
  var meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = row.meta || '';
  name.appendChild(title);
  name.appendChild(meta);
  var shop = document.createElement('td');
  shop.appendChild(skuLink(row.shopUrl, row.shop || '—'));
  if (row.mall) {
    var pill = document.createElement('span');
    pill.className = 'mall-pill';
    pill.textContent = 'Mall';
    shop.appendChild(pill);
  }
  var price = document.createElement('td');
  price.appendChild(document.createTextNode(row.price || '—'));
  if (row.band) {
    var band = document.createElement('div');
    band.className = 'meta';
    band.textContent = row.band;
    price.appendChild(band);
  }
  tr.appendChild(photo);
  tr.appendChild(name);
  tr.appendChild(shop);
  tr.appendChild(price);
  ['s7', 's30', 'sall', 'g30', 'gall', 'rating', 'comm'].forEach(function(key) {
    tr.appendChild(skuText(row[key]));
  });
  return tr;
}
function apply(tab) {
  var s = st(tab);
  var shown = visibleRows(tab);
  var pages = Math.max(1, Math.ceil(shown.length / PAGE));
  if (s.page > pages) s.page = pages;
  if (s.page < 1) s.page = 1;
  var start = (s.page - 1) * PAGE;
  var body = document.querySelector('#tbl_' + tab + ' tbody');
  if (body) {
    body.textContent = '';
    var slice = shown.slice(start, start + PAGE);
    if (!slice.length) {
      var tr = document.createElement('tr');
      var td = document.createElement('td');
      td.colSpan = 11;
      td.textContent = 'Chưa có món.';
      tr.appendChild(td);
      body.appendChild(tr);
    } else {
      slice.forEach(function(row) { body.appendChild(renderSkuRow(row)); });
    }
  }
  var label = document.getElementById('page_' + tab);
  if (label) label.textContent = 'Trang ' + s.page + ' / ' + pages + ' · ' + shown.length + ' món';
}
function filterTab(tab, queryVal, shopVal) {
  var s = st(tab);
  if (queryVal !== null) s.q = String(queryVal || '').toLowerCase().trim();
  if (shopVal !== null) s.shop = shopVal;
  s.page = 1;
  apply(tab);
}
function turn(tab, delta) { st(tab).page += delta; apply(tab); }
function sortTab(tab, key) {
  var s = st(tab);
  s.dir = s.sort === key ? -s.dir : -1;
  s.sort = key;
  s.page = 1;
  apply(tab);
}
function switchTab(tabId, btn) {
  var root = btn.closest('.keyword-block') || document;
  root.querySelectorAll('.tab-btn').forEach(function(b) {
    if (b.classList.contains('kw-btn')) return;
    b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
  });
  root.querySelectorAll('.sa-tab-panel').forEach(function(panel) {
    panel.style.display = panel.id === 'panel_' + tabId ? 'block' : 'none';
  });
}
function showKeyword(id) {
  document.querySelectorAll('.keyword-block').forEach(function(el) {
    el.style.display = el.id === id ? 'block' : 'none';
  });
  document.querySelectorAll('.kw-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-kw') === id);
  });
}
function exportCsv(tab) {
  var shown = visibleRows(tab);
  var header = ['Tên', 'Shop', 'Giá', '7 ngày', '30 ngày', 'Tích lũy', 'DT 30 ngày', 'DT tích lũy', 'Điểm', 'Hoa hồng'];
  var lines = [header].concat(shown.map(function(row) {
    return [row.title, row.shop, row.price, row.s7, row.s30, row.sall, row.g30, row.gall, row.rating, row.comm];
  }));
  var csv = lines.map(function(cols) {
    return cols.map(function(value) {
      return '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
    }).join(',');
  }).join('\\n');
  var blob = new Blob(['\\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bao_cao_' + tab + '.csv';
  a.click();
}
loadSku();
document.querySelectorAll('table.sku').forEach(function(tbl) { apply(tbl.getAttribute('data-tab')); });
function placeHelp(wrap) {
  var pop = wrap.querySelector('.help-pop');
  var btn = wrap.querySelector('.help');
  if (!pop || !btn) return;
  var width = Math.min(280, window.innerWidth - 24);
  pop.style.width = width + 'px';
  var rect = btn.getBoundingClientRect();
  var height = pop.offsetHeight || 220;
  var left = Math.min(Math.max(12, rect.left - 12), window.innerWidth - width - 12);
  var below = rect.bottom + 8;
  var above = rect.top - height - 8;
  var top = below + height > window.innerHeight - 8 && above > 8 ? above : below;
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
}
function closeHelp(wrap) {
  wrap.classList.remove('open');
  wrap.classList.remove('show');
  var btn = wrap.querySelector('.help');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}
document.querySelectorAll('.help-wrap').forEach(function(wrap) {
  var hideTimer = 0;
  var pop = wrap.querySelector('.help-pop');
  if (pop) {
    pop.addEventListener('mouseenter', function() {
      clearTimeout(hideTimer);
      wrap.classList.add('show');
    });
    pop.addEventListener('mouseleave', function() {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function() {
        if (!wrap.classList.contains('open')) wrap.classList.remove('show');
      }, 180);
    });
  }
  wrap.addEventListener('mouseenter', function() {
    clearTimeout(hideTimer);
    wrap.classList.add('show');
    placeHelp(wrap);
  });
  wrap.addEventListener('mouseleave', function() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function() {
      if (!wrap.classList.contains('open')) wrap.classList.remove('show');
    }, 180);
  });
  wrap.addEventListener('click', function(ev) {
    ev.stopPropagation();
    if (!ev.target.closest('.help')) return;
    ev.preventDefault();
    var open = !wrap.classList.contains('open');
    document.querySelectorAll('.help-wrap.open').forEach(closeHelp);
    if (open) {
      wrap.classList.add('open');
      wrap.classList.add('show');
      var btn = wrap.querySelector('.help');
      if (btn) btn.setAttribute('aria-expanded', 'true');
      placeHelp(wrap);
    }
  });
});
document.addEventListener('click', function() {
  document.querySelectorAll('.help-wrap.open').forEach(closeHelp);
});
document.addEventListener('keydown', function(ev) {
  if (ev.key !== 'Escape') return;
  document.querySelectorAll('.help-wrap.open').forEach(closeHelp);
});
"""


def _vnd(value: Any) -> str:
    try:
        amount = int(round(float(value or 0)))
    except (TypeError, ValueError):
        amount = 0
    return f"{amount:,} đ".replace(",", ".")


def _num(value: Any) -> str:
    if value is None or value == "":
        return "—"
    try:
        amount = float(value)
    except (TypeError, ValueError):
        return "—"
    if abs(amount - round(amount)) < 1e-9:
        return f"{int(round(amount)):,}".replace(",", ".")
    text = f"{amount:.4f}".rstrip("0").rstrip(".")
    whole, frac = text.split(".")
    sign = "-" if whole.startswith("-") else ""
    digits = whole[1:] if sign else whole
    grouped = f"{int(digits):,}".replace(",", ".")
    return f"{sign}{grouped},{frac}"


def _esc(value: Any) -> str:
    return html.escape(str(value if value is not None else ""), quote=True)


def _score_paint(score: Any) -> tuple[str, str]:
    try:
        number = float(score or 0)
    except (TypeError, ValueError):
        number = 0
    if number >= 68:
        return "#4ade80", "rgba(16,185,129,.18)"
    if number >= 45:
        return "#fbbf24", "rgba(217,119,6,.18)"
    if number >= 28:
        return "#fb923c", "rgba(249,115,22,.16)"
    return "#f87171", "rgba(239,68,68,.16)"


def _help(what: str, source: str, use: str) -> str:
    card = (
        f"<b>Là gì</b>{_esc(what)}"
        f"<b>Tính từ</b>{_esc(source)}"
        f"<b>Dùng để</b>{_esc(use)}"
    )
    return (
        '<span class="help-wrap"><button type="button" class="help" aria-expanded="false" aria-label="Giải thích chỉ số">?</button>'
        f'<span class="help-pop" role="tooltip"><span class="help-card">{card}</span></span></span>'
    )


_MARKET_HELP = {
    "source": (
        "Lời nhắc nguồn không phủ hết sàn.",
        "Ghi chú đi kèm khối tổng. Lượt bán trong khối đó có thể thấp hơn thực tế vì món thiếu số bán không được cộng đủ.",
        "Không đọc các ô tổng như doanh số của toàn bộ sàn.",
    ),
    "gifts": (
        "Nhóm quà nguồn đã tách khỏi các tổng phía dưới.",
        "Số món và số tiền nguồn ghi ở phần quà bị loại.",
        "Biết doanh thu tổng không cộng nhóm quà này.",
    ),
    "tracked": (
        "Nhịp bán gần đây của nhóm có lịch sử theo dõi.",
        "Khối khoảng 30 ngày, chỉ món có ít nhất 8 ngày lịch sử. Độ phủ là phần món đủ lịch sử. Không phải tháng lịch trong câu hỏi.",
        "Xem sức bán gần đây, tách khỏi số tích lũy.",
    ),
    "max_commission": (
        "Mức hoa hồng cao nhất nguồn thấy trong nhóm.",
        "Trần hoa hồng trong khối tổng, đã đổi sang phần trăm.",
        "Nhận ra món ngoại lệ. Không lấy số này làm mức hoa hồng kỳ vọng.",
    ),
    "ocean": (
        "Điểm 0–100 nói nhóm còn dễ chen hay đã chật.",
        "Điểm nguồn trả trong khối tổng. Từ 68 điểm là còn rộng, từ 45 là khá, từ 28 là trung bình, dưới 28 là cạnh tranh gắt. Trang không tính lại điểm từ vài món đầu bảng.",
        "Nhìn nhanh trước khi đọc độ tập trung và tỷ lệ có bán.",
    ),
    "sp": (
        "Số món nguồn đang theo dõi cho tên hàng này.",
        "Tổng số món trong khối tổng, không đếm lại từ bảng phía dưới.",
        "Biết nhóm rộng hay hẹp trước khi xem vài món bán chạy.",
    ),
    "shop": (
        "Số shop có món trong cùng khối tổng.",
        "Tổng số shop nguồn trả.",
        "Thấy nhiều người bán hay chỉ vài shop.",
    ),
    "sold": (
        "Tổng lượt bán đã ghi nhận.",
        "Khối tổng, tính tích lũy các món đã thu thập. Không phải doanh số của một tháng lịch.",
        "Ước sức bán của cả nhóm, không dùng làm doanh số tháng.",
    ),
    "revenue": (
        "Tiền hàng nguồn đã cộng cho các món trong khối tổng.",
        "Cùng cửa sổ tích lũy với lượt bán.",
        "So quy mô tiền của nhóm, không phải doanh thu riêng của tháng được hỏi.",
    ),
    "avg_price": (
        "Giá thường gặp của cả nhóm.",
        "Giá trung bình nguồn trả trong khối tổng, không phải giá trung bình của vài món đầu bảng.",
        "Đặt mốc giá, tránh để vài món đắt kéo lệch.",
    ),
    "span": (
        "Giá thấp nhất và giá cao nhất còn trong khối tổng.",
        "Mức sàn và mức trần nguồn trả.",
        "Thấy biên có bị món giá rất thấp hoặc món cực đắt kéo giãn không.",
    ),
    "sell": (
        "Phần món đã có ít nhất một lượt bán.",
        "Số món có bán chia số món đang theo dõi. Nguồn trả sẵn tỷ lệ này.",
        "Biết hàng đăng lên có bán được hay phần lớn là tin chưa có đơn.",
    ),
    "with_sales": (
        "Số món đã phát sinh lượt bán.",
        "Đếm trong khối tổng.",
        "Đọc cùng tỷ lệ có bán để thấy mẫu số là bao nhiêu món.",
    ),
    "hhi": (
        "Độ tập trung doanh thu. Gần 0 là tiền chia cho nhiều shop. Gần 1 là gần như một shop lấy hết.",
        "Nguồn trả sẵn chỉ số này trong khối tổng. Trang không bình phương lại thị phần từ danh sách đang xem.",
        "Phân biệt nhóm còn chỗ cho shop mới với nhóm một shop đã chiếm phần lớn tiền.",
    ),
    "commission": (
        "Mức hoa hồng thường gặp, tính bằng phần trăm.",
        "Tỷ lệ hoa hồng trung bình trong khối tổng. Nguồn gửi số nhỏ hơn 1 thì trang đổi sang phần trăm.",
        "Ước chi phí affiliate thường gặp, không lấy mức cao nhất.",
    ),
}

_SAMPLE_HELP = {
    "ocean": (
        "Điểm 0–100 nói mẫu này còn dễ chen hay đã chật.",
        "Ghép từ mẫu vừa lấy: độ phân tán doanh thu giữa các shop tối đa 40 điểm, tỷ lệ có bán tối đa 35 điểm, tỷ lệ món ngoài Mall tối đa 25 điểm. Điểm được kẹp từ 8 đến 96. Từ 68 là còn rộng, từ 45 là khá, từ 28 là trung bình, dưới 28 là cạnh tranh gắt.",
        "Nhìn nhanh mẫu tìm được. Điểm này không đại diện cho cả sàn.",
    ),
    "sp": (
        "Số món có trong mẫu vừa lấy.",
        "Đếm dòng nguồn trả cho lần tìm này, không phải toàn bộ món trên sàn.",
        "Biết mẫu dày hay mỏng trước khi đọc các tỷ lệ.",
    ),
    "shop": (
        "Số shop khác nhau trong mẫu.",
        "Đếm shop của các món vừa lấy.",
        "Thấy mẫu có nhiều người bán hay chỉ vài shop.",
    ),
    "sold": (
        "Tổng lượt bán của các món trong mẫu.",
        "Cộng lượt bán nguồn ghi trên từng món vừa lấy.",
        "Ước sức bán của mẫu, không suy ra cả sàn.",
    ),
    "revenue": (
        "Tiền hàng của các món trong mẫu.",
        "Cộng doanh thu từng món. Sàn không có doanh thu riêng thì lấy giá nhân lượt bán.",
        "So quy mô tiền trong mẫu, không phải doanh thu cả sàn.",
    ),
    "avg_price": (
        "Giá thường gặp trong mẫu.",
        "Trung bình giá các món không bị coi là quà. Quà là giá từ 2.000 đ trở xuống hoặc tên có chữ quà tặng.",
        "Đặt mốc giá của đúng mẫu này.",
    ),
    "span": (
        "Giá thấp nhất và cao nhất trong mẫu.",
        "Min và max giá của các món vừa lấy.",
        "Thấy biên giá của mẫu, không phải biên của cả sàn.",
    ),
    "sell": (
        "Phần món trong mẫu đã có lượt bán.",
        "Số món có lượt bán lớn hơn 0 chia số món trong mẫu.",
        "Biết trong mẫu này hàng có chạy hay phần lớn chưa có đơn.",
    ),
    "with_sales": (
        "Số món trong mẫu đã có lượt bán.",
        "Đếm món có lượt bán lớn hơn 0.",
        "Đọc cùng tỷ lệ có bán để thấy mẫu số.",
    ),
    "hhi": (
        "Độ tập trung doanh thu trong mẫu. Gần 0 là tiền chia nhiều shop. Gần 1 là một shop chiếm gần hết.",
        "Tổng bình phương thị phần doanh thu từng shop trong mẫu. Không có doanh thu thì lấy 1 chia số shop.",
        "Thấy trong mẫu một shop có nuốt phần lớn tiền không.",
    ),
    "commission": (
        "Mức hoa hồng thường gặp trong mẫu.",
        "Trung bình hoa hồng của các món có ghi hoa hồng.",
        "Ước chi phí affiliate của mẫu, chỉ khi nguồn có ghi.",
    ),
    "bins": (
        "Sáu dải giá của đúng danh sách đang xem.",
        "Chia các món trong danh sách thành sáu khoảng giá, rồi tính phần món và phần doanh thu của từng khoảng. Không phải toàn bộ món trên sàn.",
        "Thấy khoảng giá nào đang gom tiền. Dải ghi Bán chạy là dải doanh thu cao nhất trong danh sách.",
    ),
    "shops": (
        "Những shop chiếm nhiều tiền nhất.",
        "Thị phần là doanh thu của shop chia tổng doanh thu đang dùng. Có khối tổng thì lấy khối đó, không thì lấy danh sách đang xem.",
        "Thấy một shop có nuốt nhóm không.",
    ),
    "momentum": (
        "Nhịp bán gần đây của từng món trong danh sách.",
        "Lượt 7 ngày đặt cạnh lượt khoảng 30 ngày của cùng món. Không nhân 7 ngày thành một tháng.",
        "Thấy món đang bán nhanh lên hay chỉ bán dồn từ trước.",
    ),
}


def _tip(scope: str, key: str) -> str:
    book = _MARKET_HELP if scope == "market_block" else _SAMPLE_HELP
    what, source, use = book[key]
    return _help(what, source, use)


def _kpi(label: str, value: str, help_html: str, tone: str = "") -> str:
    klass = f"kpi-val {tone}".strip()
    return (
        f'<div class="kpi-box"><div class="kpi-lbl">{_esc(label)}{help_html}</div>'
        f'<div class="{klass}">{_esc(value)}</div></div>'
    )


def _kpi_range(sample: Dict[str, Any], help_html: str) -> str:
    low = _esc(_vnd(sample.get("min_price_vnd")))
    high = _esc(_vnd(sample.get("max_price_vnd")))
    return (
        f'<div class="kpi-box"><div class="kpi-lbl">Biên giá{help_html}</div>'
        f'<div class="kpi-val amber kpi-range"><span>{low}</span><span>{high}</span></div></div>'
    )


def _alerts(sample: Dict[str, Any]) -> str:
    cards = []
    if sample.get("source_note"):
        cards.append(
            f'<div class="alert-card warn"><div class="alert-title">Phạm vi nguồn{_tip("market_block", "source")}</div>'
            f'<div class="alert-desc">{_esc(sample.get("source_note"))}</div></div>'
        )
    gifts = sample.get("gifts_excluded") if isinstance(sample.get("gifts_excluded"), dict) else {}
    if gifts:
        cards.append(
            f'<div class="alert-card warn"><div class="alert-title">Quà đã loại khỏi tổng{_tip("market_block", "gifts")}</div>'
            f'<div class="alert-desc">{_esc(_num(gifts.get("products")))} món · {_esc(_vnd(gifts.get("revenue_vnd")))}</div></div>'
        )
    tracked = sample.get("window_tracked_30d") if isinstance(sample.get("window_tracked_30d"), dict) else {}
    if tracked:
        cards.append(
            f'<div class="alert-card info"><div class="alert-title">Nhịp khoảng 30 ngày{_tip("market_block", "tracked")}</div>'
            f'<div class="alert-desc">{_esc(_num(tracked.get("total_sold")))} lượt · {_esc(_vnd(tracked.get("total_revenue_vnd")))} · '
            f'độ phủ {_esc(_num(tracked.get("coverage_pct")))}%. Không phải tháng lịch.</div></div>'
        )
    if sample.get("max_commission_pct") is not None:
        cards.append(
            f'<div class="alert-card ok"><div class="alert-title">Hoa hồng cao nhất nguồn trả{_tip("market_block", "max_commission")}</div>'
            f'<div class="alert-desc">{_esc(_num(sample.get("max_commission_pct")))}%. Mức ngoại lệ, không phải mức nên kỳ vọng.</div></div>'
        )
    if not cards:
        return ""
    return f'<div class="alert-row">{"".join(cards)}</div>'


def _overview(sample: Dict[str, Any]) -> str:
    score = sample.get("blue_ocean_score")
    color, badge = _score_paint(score)
    width = 0
    try:
        width = max(0, min(100, float(score or 0)))
    except (TypeError, ValueError):
        width = 0
    commission = "—" if sample.get("avg_commission_pct") is None else f"{_num(sample.get('avg_commission_pct'))}%"
    sell = "—" if sample.get("sell_through_pct") is None else f"{_num(sample.get('sell_through_pct'))}%"
    scope = "market_block" if sample.get("scope") == "market_block" else "sample"
    cards = (
        _kpi("Sản phẩm", _num(sample.get("sp_count")), _tip(scope, "sp"), "blue")
        + _kpi("Shop", _num(sample.get("shop_count")), _tip(scope, "shop"), "blue")
        + _kpi("Lượt bán", _num(sample.get("total_sold")), _tip(scope, "sold"), "purple")
        + _kpi("Doanh thu", _vnd(sample.get("total_revenue_vnd")), _tip(scope, "revenue"))
        + _kpi("Giá trung bình", _vnd(sample.get("avg_price_vnd")), _tip(scope, "avg_price"), "amber")
        + _kpi_range(sample, _tip(scope, "span"))
        + _kpi("Tỷ lệ có bán", sell, _tip(scope, "sell"), "green")
        + _kpi("Món có bán", _num(sample.get("products_with_sales")), _tip(scope, "with_sales"), "green")
        + _kpi("HHI", _num(sample.get("hhi")), _tip(scope, "hhi"))
        + _kpi("Hoa hồng trung bình", commission, _tip(scope, "commission"))
    )
    note = "Thẻ này lấy từ khối tổng của sàn." if sample.get("scope") == "market_block" else "Thẻ này là số của mẫu tìm được."
    return f"""
    <div class="overview-split">
      <div class="blue-ocean-card">
        <div class="bo-caption">Chỗ còn trống{_tip(scope, "ocean")}</div>
        <div><span class="bo-num" style="color:{color}">{_esc(_num(score))}</span><span class="bo-den"> / 100</span></div>
        <div class="bo-badge" style="color:{color};background:{badge}">{_esc(sample.get("blue_ocean_label") or "chưa có nhãn")}</div>
        <div class="bo-track"><div class="bo-fill" style="width:{width}%;background:{color}"></div></div>
        <p class="bo-note">{_esc(note)} HHI {_esc(_num(sample.get("hhi")))}.</p>
      </div>
      <div class="kpi-panel"><div class="kpi-panel-head">Chỉ số toàn cảnh</div><div class="kpi-grid">{cards}</div></div>
    </div>"""


def _price_chart(sample: Dict[str, Any]) -> str:
    bins = [band for band in (sample.get("price_bins") or []) if isinstance(band, dict)]
    if not bins:
        return ""
    rows = []
    for band in bins:
        sweet = " sweet" if band.get("is_sweet_spot") else ""
        tag = '<span class="sweet-tag">Bán chạy</span>' if band.get("is_sweet_spot") else ""
        sku = float(band.get("sku_pct") or 0)
        gmv = float(band.get("gmv_pct") or 0)
        rows.append(
            f'<div class="bin-row{sweet}"><div class="bin-lbl">{_esc(band.get("label"))}{tag}</div>'
            '<div>'
            f'<div class="bin-line"><span class="mini-tag">Món {_esc(_num(sku))}%</span><div class="mini-track"><div class="mini-fill blue" style="width:{max(3, min(100, sku))}%"></div></div></div>'
            f'<div class="bin-line"><span class="mini-tag">Doanh thu {_esc(_num(gmv))}%</span><div class="mini-track"><div class="mini-fill green" style="width:{max(3, min(100, gmv))}%"></div></div></div>'
            f'</div><div class="bin-val">{_esc(_vnd(band.get("gmv")))}</div></div>'
        )
    return (
        '<div class="sa-panel"><h3 class="sa-title">Khoảng giá của danh sách đang xem'
        + _tip("sample", "bins")
        + "</h3>"
        '<p class="sa-hint">Sáu dải của đúng danh sách này, không phải của toàn bộ món trên sàn.</p>'
        + "".join(rows)
        + "</div>"
    )


def _shop_table(sample: Dict[str, Any]) -> str:
    shops = [row for row in (sample.get("top_shops") or []) if isinstance(row, dict)]
    source = "khối tổng"
    if not shops:
        rolled: Dict[str, Dict[str, Any]] = {}
        for item in sample.get("items") or []:
            if not isinstance(item, dict):
                continue
            key = str(item.get("shop_id") or item.get("shop_name") or "")
            if not key:
                continue
            entry = rolled.setdefault(key, {"shop_name": item.get("shop_name") or key, "shop_url": item.get("shop_url") or "", "revenue_vnd": 0, "product_count": 0})
            entry["revenue_vnd"] += int(item.get("gmv_vnd") or 0)
            entry["product_count"] += 1
        total = sum(int(row["revenue_vnd"]) for row in rolled.values()) or 1
        shops = sorted(rolled.values(), key=lambda row: int(row["revenue_vnd"]), reverse=True)[:8]
        for row in shops:
            row["share_pct"] = round(int(row["revenue_vnd"]) / total * 100, 1)
        source = "danh sách đang xem"
    if not shops:
        return ""
    body = []
    for shop in shops[:10]:
        name = str(shop.get("shop_name") or shop.get("shop_id") or "Shop")
        url = str(shop.get("shop_url") or "")
        label = f'<a href="{_esc(url)}">{_esc(name)}</a>' if url else _esc(name)
        share = float(shop.get("share_pct") or 0)
        body.append(
            "<tr>"
            f"<td>{label}</td><td>{_esc(_num(shop.get('product_count')))}</td><td>{_esc(_vnd(shop.get('revenue_vnd')))}</td>"
            f'<td><div class="bin-line"><div class="mini-track"><div class="mini-fill amber" style="width:{max(3, min(100, share))}%"></div></div>'
            f'<span class="share-pill">{_esc(_num(share))}%</span></div></td></tr>'
        )
    return (
        f'<div class="sa-panel"><h3 class="sa-title">Shop dẫn đầu{_tip("sample", "shops")}</h3><p class="sa-hint">Thị phần lấy từ {source}.</p>'
        '<div class="tbl-wrap"><table><thead><tr><th>Shop</th><th>Món</th><th>Doanh thu</th><th>Thị phần</th></tr></thead>'
        f'<tbody>{"".join(body)}</tbody></table></div></div>'
    )


def _momentum(sample: Dict[str, Any]) -> str:
    rows = []
    for item in sample.get("items") or []:
        if isinstance(item, dict) and item.get("sold_7d") is not None and item.get("sold_30d") is not None:
            rows.append(item)
    rows.sort(key=lambda item: int(item.get("gmv_vnd") or 0), reverse=True)
    rows = rows[:8]
    if not rows:
        return ""
    body = []
    for item in rows:
        week = float(item.get("sold_7d") or 0)
        month = float(item.get("sold_30d") or 0)
        peak = max(week, month, 1)
        body.append(
            f'<div class="bin-row"><div class="bin-lbl">{_esc(str(item.get("title") or "")[:48])}</div><div>'
            f'<div class="bin-line"><span class="mini-tag">7 ngày</span><div class="mini-track"><div class="mini-fill amber" style="width:{max(3, round(week / peak * 100))}%"></div></div></div>'
            f'<div class="bin-line"><span class="mini-tag">30 ngày</span><div class="mini-track"><div class="mini-fill blue" style="width:{max(3, round(month / peak * 100))}%"></div></div></div>'
            f'</div><div class="bin-val">{_esc(_num(week))} / {_esc(_num(month))}</div></div>'
        )
    return (
        '<div class="sa-panel"><h3 class="sa-title">Đà bán' + _tip("sample", "momentum") + "</h3>"
        '<p class="sa-hint">Bảy ngày đặt cạnh 30 ngày. Không nhân bảy ngày thành một tháng.</p>'
        + "".join(body)
        + "</div>"
    )


def _catalog_row(row: Dict[str, Any]) -> Dict[str, Any]:
    band = ""
    if row.get("price_min_vnd") is not None and row.get("price_max_vnd") is not None:
        band = f"{_vnd(row.get('price_min_vnd'))} – {_vnd(row.get('price_max_vnd'))}"
    cv = "" if row.get("price_cv") is None else f" · dao động {_num(row.get('price_cv'))}"
    growth = "—" if row.get("growth") is None else _num(row.get("growth"))
    tracked = "chưa có số ngày theo dõi" if row.get("days_tracked") is None else f"{_num(row.get('days_tracked'))} ngày theo dõi"
    return {
        "title": str(row.get("title") or ""),
        "url": str(row.get("url") or ""),
        "shop": str(row.get("shop_name") or row.get("shop_id") or "—"),
        "shopUrl": str(row.get("shop_url") or ""),
        "mall": bool(row.get("is_mall")),
        "gift": bool(row.get("is_gift")),
        "image": str(row.get("image_url") or ""),
        "q": str(row.get("title") or "").lower(),
        "price": _vnd(row.get("price_vnd")),
        "band": band,
        "s7": _num(row.get("sold_7d")),
        "s30": _num(row.get("sold_30d")),
        "sall": _num(row.get("sold_all")),
        "g30": "—" if row.get("gmv_30d_vnd") is None else _vnd(row.get("gmv_30d_vnd")),
        "gall": "—" if row.get("gmv_all_vnd") is None else _vnd(row.get("gmv_all_vnd")),
        "rating": "—" if row.get("rating") is None else _num(row.get("rating")),
        "comm": "—" if row.get("commission_pct") is None else f"{_num(row.get('commission_pct'))}%",
        "meta": f"{tracked} · hệ số {growth}{cv}",
        "priceN": int(row.get("price_vnd") or 0),
        "soldN": int(row.get("sold_all") or row.get("sold") or row.get("sold_30d") or 0),
        "gmvN": int(row.get("gmv_vnd") or 0),
    }


def _products(sample: Dict[str, Any], tab: str) -> str:
    items = [row for row in (sample.get("items") or []) if isinstance(row, dict)]
    items.sort(key=lambda row: int(row.get("gmv_vnd") or 0), reverse=True)
    blob = json.dumps([_catalog_row(row) for row in items], ensure_ascii=False).replace("<", "\\u003c")
    hint = f"{len(items)} món · {_PAGE} dòng mỗi trang"
    if sample.get("list_truncated"):
        hint += ". Nguồn còn trang phía sau; danh sách dừng ở các món doanh thu cao nhất đã lấy được."
    return f"""
    <div class="sa-panel">
      <div class="table-toolbar">
        <div>
          <h3 class="sa-title" style="margin:0">Danh sách đang xem</h3>
          <p class="sa-hint">{_esc(hint)}</p>
        </div>
        <div class="filter-controls">
          <input class="ctrl-input" placeholder="Tìm tên món" oninput="filterTab('{tab}', this.value, null)">
          <select class="ctrl-select" onchange="filterTab('{tab}', null, this.value)">
            <option value="all">Mọi shop</option>
            <option value="mall">Chỉ Mall</option>
            <option value="nogift">Ẩn quà</option>
          </select>
          <button type="button" class="ctrl-btn" onclick="sortTab('{tab}', 'gmvN')">Doanh thu</button>
          <button type="button" class="ctrl-btn" onclick="sortTab('{tab}', 'soldN')">Lượt bán</button>
          <button type="button" class="ctrl-btn" onclick="sortTab('{tab}', 'priceN')">Giá</button>
          <button type="button" class="ctrl-btn" onclick="exportCsv('{tab}')">Tải CSV</button>
        </div>
      </div>
      <script type="application/json" class="sku-data" data-tab="{tab}">{blob}</script>
      <div class="tbl-wrap"><table class="sku" id="tbl_{tab}" data-tab="{tab}"><thead><tr>
        <th>Ảnh</th><th>Tên</th><th>Shop</th><th>Giá</th><th>7 ngày</th><th>30 ngày</th><th>Tích lũy</th>
        <th>DT 30 ngày</th><th>DT tích lũy</th><th>Điểm</th><th>Hoa hồng</th>
      </tr></thead><tbody></tbody></table></div>
      <div class="pager" style="margin-top:10px">
        <button type="button" class="ctrl-btn" onclick="turn('{tab}', -1)">Trước</button>
        <span class="page-label" id="page_{tab}">Trang 1</span>
        <button type="button" class="ctrl-btn" onclick="turn('{tab}', 1)">Sau</button>
      </div>
    </div>"""


def _details(sample: Dict[str, Any]) -> str:
    rows = [row for row in (sample.get("detail_items") or []) if isinstance(row, dict)][:5]
    if not rows:
        return ""
    body = []
    for row in rows:
        prices = []
        if row.get("list_price_vnd") is not None:
            prices.append(f"danh sách {_vnd(row.get('list_price_vnd'))}")
        if row.get("detail_price_vnd") is not None:
            prices.append(f"chi tiết {_vnd(row.get('detail_price_vnd'))}")
        body.append(
            "<tr>"
            f"<td>{_esc(row.get('category_name') or '—')}</td>"
            f"<td>{_esc('—' if row.get('seller_commission_pct') is None else _num(row.get('seller_commission_pct')) + '%')}</td>"
            f"<td>{_esc('—' if row.get('platform_commission_pct') is None else _num(row.get('platform_commission_pct')) + '%')}</td>"
            f"<td>{_esc('—' if row.get('commission_cap_vnd') is None else _vnd(row.get('commission_cap_vnd')))}</td>"
            f"<td>{_esc(_num(row.get('price_change_7d')))}</td><td>{_esc(_num(row.get('price_change_30d')))}</td>"
            f"<td>{_esc(_num(row.get('discount_pct')))}</td><td>{_esc(_num(row.get('stock')))}</td>"
            f"<td>{_esc(' · '.join(prices) or '—')}</td></tr>"
        )
    return (
        '<div class="sa-panel"><h3 class="sa-title">Nhóm chi tiết</h3>'
        '<p class="sa-hint">Vài món đứng đầu hoặc món đang đánh giá. Giá chi tiết có thể khác giá trong danh sách.</p>'
        '<div class="tbl-wrap"><table><thead><tr><th>Ngành</th><th>HH người bán</th><th>HH sàn</th><th>Trần</th>'
        f'<th>Đổi giá 7 ngày</th><th>Đổi giá 30 ngày</th><th>% giảm</th><th>Tồn</th><th>Giá</th></tr></thead><tbody>{"".join(body)}</tbody></table></div></div>'
    )


def _panel(sample: Dict[str, Any], tab: str, visible: bool) -> str:
    floor = _FLOOR.get(str(sample.get("platform")), str(sample.get("platform")))
    mode = str(sample.get("mode") or "")
    badge = f'<span class="mode-badge {("live" if mode == "live" else "sandbox")}">{_esc(mode or "n/a")}</span>'
    if sample.get("mode") == "error":
        inner = "<p>Chưa lấy được số.</p>"
    else:
        banners = []
        if sample.get("scope") != "market_block":
            banners.append('<p class="banner">Mẫu tìm kiếm. Các số trong tab này là của mẫu vừa lấy.</p>')
        if sample.get("mode") == "sandbox":
            banners.append('<p class="banner">Mẫu mô phỏng, vì sàn chưa trả số thật.</p>')
        estimate = ""
        if sample.get("scope") != "market_block":
            estimate = '<p class="sa-hint">Doanh thu của sàn không có khối tổng là ước tính giá nhân lượt bán.</p>'
        inner = (
            f'<div class="sa-panel"><div class="sa-sub">{_esc(sample.get("name"))} · {_esc(floor)} {badge}</div>'
            f'<h2 class="sa-title">Toàn cảnh</h2>{"".join(banners)}{_alerts(sample)}{_overview(sample)}{estimate}</div>'
            + _price_chart(sample)
            + _shop_table(sample)
            + _momentum(sample)
            + _products(sample, tab)
            + _details(sample)
        )
    style = "" if visible else ' style="display:none"'
    return f'<section class="sa-tab-panel" id="panel_{tab}"{style}>{inner}</section>'


def _groups(samples: List[Dict[str, Any]]) -> List[tuple[str, List[Dict[str, Any]]]]:
    order: List[str] = []
    buckets: Dict[str, List[Dict[str, Any]]] = {}
    for sample in samples:
        name = str(sample.get("name") or "Kết quả")
        if name not in buckets:
            order.append(name)
            buckets[name] = []
        buckets[name].append(sample)
    return [(name, buckets[name]) for name in order]


def render_report_html(title: str, prose: str, samples: List[Dict[str, Any]], related: List[str]) -> str:
    groups = _groups(samples)
    keyword_nav = ""
    blocks = []
    if len(groups) > 1:
        keyword_nav = '<div class="tabs-bar">' + "".join(
            f'<button type="button" class="tab-btn kw-btn{" active" if index == 0 else ""}" data-kw="kw_{index}" onclick="showKeyword(\'kw_{index}\')">{_esc(name)}</button>'
            for index, (name, _rows) in enumerate(groups)
        ) + "</div>"
    serial = 0
    for index, (_name, rows) in enumerate(groups):
        tabs = []
        panels = []
        for offset, sample in enumerate(rows):
            tab = f"t{serial}"
            serial += 1
            floor = _FLOOR.get(str(sample.get("platform")), str(sample.get("platform")))
            tabs.append(
                f'<button type="button" class="tab-btn{" active" if offset == 0 else ""}" data-tab="{tab}" onclick="switchTab(\'{tab}\', this)">{_esc(floor)}</button>'
            )
            panels.append(_panel(sample, tab, offset == 0))
        hidden = "" if index == 0 else ' style="display:none"'
        blocks.append(f'<div class="keyword-block" id="kw_{index}"{hidden}><div class="tabs-bar">{"".join(tabs)}</div>{"".join(panels)}</div>')
    related_html = ""
    if related:
        chips = "".join(f"<li>{_esc(item)}</li>" for item in related[:5])
        related_html = f'<div class="sa-panel"><h3 class="sa-title">Cụm tìm kèm</h3><ul>{chips}</ul><p class="sa-hint">Chữ người ta tìm, không phải lượt bán.</p></div>'
    return f"""<!DOCTYPE html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{_esc(title)}</title><style>{_CSS}</style></head><body><div class="wrap">
<div class="hero"><span class="pill">PRODUCT HUNTER · BÁO CÁO THỊ TRƯỜNG</span><h1>{_esc(title)}</h1>
<p class="hero-narrative">{_esc(prose)}</p></div>
{keyword_nav}{"".join(blocks)}{related_html}
</div><script>{_JS}</script></body></html>"""


def write_report_page(path: Path, title: str, prose: str, samples: List[Dict[str, Any]], related: List[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(render_report_html(title, prose, samples, related), encoding="utf-8")
