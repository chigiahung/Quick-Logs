export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.slice(1);

    // 1. TRANG CHỦ: Giao diện nhập liệu tối giản
    if (path === "") {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Quick Logs</title>
          <style>
            body { font-family: monospace; padding: 20px; background: #fafafa; color: #333; max-width: 800px; margin: auto; }
            textarea { width: 100%; height: 250px; border: 2px solid #000; padding: 10px; font-family: monospace; font-size: 14px; box-sizing: border-box; }
            button { margin-top: 15px; padding: 12px 25px; background: #000; color: #fff; border: none; cursor: pointer; font-weight: bold; }
            button:hover { background: #444; }
            #result { margin-top: 20px; padding: 15px; background: #e7f3ff; border: 1px solid #007bff; display: none; word-break: break-all; }
          </style>
        </head>
        <body>
          <h2>[ QUICK LOGS ]</h2>
          <p>Dán nội dung vào đây. Link sẽ tự hủy sau 12 giờ.</p>
          <textarea id="text" placeholder="Gõ hoặc dán log vào đây..."></textarea><br>
          <button id="btn" onclick="save()">TẠO LINK NHANH</button>
          <div id="result"></div>

          <script>
            async function save() {
              const btn = document.getElementById('btn');
              const content = document.getElementById('text').value;
              if(!content) return alert("Chưa nhập gì mà ba!");
              
              btn.innerText = "ĐANG TẠO...";
              btn.disabled = true;

              try {
                const res = await fetch('/save', {
                  method: 'POST',
                  body: JSON.stringify({ content })
                });
                const data = await res.json();
                const resDiv = document.getElementById('result');
                resDiv.style.display = 'block';
                resDiv.innerHTML = '<strong>Link của ông:</strong><br><a href="'+data.url+'">'+data.url+'</a>';
              } catch (e) {
                alert("Lỗi rồi, check lại KV Binding nhé!");
              } finally {
                btn.innerText = "TẠO LINK NHANH";
                btn.disabled = false;
              }
            }
          </script>
        </body>
        </html>
      `, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    // 2. API LƯU: Xử lý lưu vào KV
    if (request.method === "POST" && path === "save") {
      try {
        const { content } = await request.json();
        // Tạo ID ngẫu nhiên 5 ký tự (chữ + số)
        const id = Math.random().toString(36).substring(2, 7);
        
        // Lưu vào KV với TTL 12 tiếng (43200 giây)
        // env.LOG_STORE phải trùng với tên lúc ông Binding trong Settings
        await env.LOG_STORE.put(id, content, { expirationTtl: 43200 });
        
        return new Response(JSON.stringify({ url: `${url.origin}/${id}` }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    }

    // 3. XEM LOG: Đọc từ KV ra
    const storedContent = await env.LOG_STORE.get(path);
    if (storedContent) {
      // Trả về dạng text thô cho nhẹ, hoặc bọc HTML nếu thích
      return new Response(storedContent, { 
        headers: { "Content-Type": "text/plain; charset=utf-8" } 
      });
    }

    return new Response("Link không tồn tại hoặc đã bị xóa sau 12h!", { status: 404 });
  }
};
