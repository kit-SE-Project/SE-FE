import React from "react";

export class WebErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main role="alert" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, background: "#f7f9fc", color: "#142033", textAlign: "center" }}>
      <h1 style={{ fontSize: 24 }}>페이지를 불러오지 못했습니다</h1>
      <p>잠시 후 다시 불러오거나 게시판 홈으로 이동해 주세요.</p>
      <button onClick={() => window.location.reload()}>다시 불러오기</button>
      <a href="/">SE 게시판 홈</a>
    </main>;
  }
}
