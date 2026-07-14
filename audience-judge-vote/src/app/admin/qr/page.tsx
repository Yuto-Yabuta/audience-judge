"use client";

import { useEffect, useState } from "react";

export default function AdminQrPage() {
  const [url, setUrl] = useState("");

  useEffect(() => {
    const envUrl = process.env.NEXT_PUBLIC_APP_URL;
    setUrl(envUrl && envUrl.length > 0 ? envUrl : window.location.origin);
  }, []);

  if (!url) return null;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=480x480&margin=12&data=${encodeURIComponent(
    url
  )}`;

  return (
    <div>
      <div className="admin-card" style={{ textAlign: "center" }}>
        <h3>会場掲示用QRコード</h3>
        <p className="help-text" style={{ marginBottom: 16 }}>
          このQRコードを会場に掲示してください。来場者がスマホで読み取ると、
          インストール不要で投票画面が開きます。
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrImageUrl}
          alt="来場者用QRコード"
          width={320}
          height={320}
          style={{ borderRadius: 12, border: "1px solid #eceef2" }}
        />
        <p style={{ marginTop: 16, wordBreak: "break-all", fontSize: 13, color: "#6b7280" }}>
          {url}
        </p>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          style={{ marginTop: 12 }}
          onClick={() => window.print()}
        >
          印刷する
        </button>
      </div>
    </div>
  );
}
