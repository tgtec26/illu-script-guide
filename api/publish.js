// Vercel 서버리스 함수: 어드민에서 보낸 콘텐츠를 GitHub 저장소의
// docs/assets/content.json 파일로 커밋합니다.
//
// 필요한 환경변수 (Vercel 프로젝트 Settings > Environment Variables):
//   GITHUB_TOKEN    - contents:write 권한이 있는 GitHub 토큰 (이 저장소 대상)
//   ADMIN_PASSWORD  - 게시 버튼을 누를 때 요구할 관리자 비밀번호
// 선택 환경변수 (기본값 있음):
//   GITHUB_OWNER (기본 tgtec26), GITHUB_REPO (기본 illu-script-guide), GITHUB_BRANCH (기본 main)

const FILE_PATH = "docs/assets/content.json";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST 요청만 허용됩니다." });
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!token || !adminPassword) {
    res.status(500).json({ error: "서버에 GITHUB_TOKEN / ADMIN_PASSWORD 환경변수가 설정되어 있지 않습니다." });
    return;
  }

  const owner = process.env.GITHUB_OWNER || "tgtec26";
  const repo = process.env.GITHUB_REPO || "illu-script-guide";
  const branch = process.env.GITHUB_BRANCH || "main";

  const body = await readJson(req);
  const password = body && body.password;
  const content = body && body.content;

  if (typeof password !== "string" || !safeEqual(password, adminPassword)) {
    res.status(401).json({ error: "비밀번호가 올바르지 않습니다." });
    return;
  }
  if (!content || typeof content !== "object") {
    res.status(400).json({ error: "게시할 content가 없습니다." });
    return;
  }

  const payload = {
    notice: content.notice || null,
    images: content.images || {},
    details: content.details || {}
  };
  const fileText = JSON.stringify(payload, null, 2) + "\n";
  const encoded = Buffer.from(fileText, "utf8").toString("base64");

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${FILE_PATH}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "illu-script-guide-admin",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  try {
    // 기존 파일 SHA 조회 (덮어쓰기에 필요; 없으면 새로 생성)
    let sha;
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, { headers });
    if (getRes.ok) {
      const current = await getRes.json();
      sha = current.sha;
    } else if (getRes.status !== 404) {
      const detail = await getRes.text();
      res.status(502).json({ error: `현재 파일 조회 실패 (${getRes.status})`, detail: detail.slice(0, 300) });
      return;
    }

    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Update site content via admin",
        content: encoded,
        branch,
        sha
      })
    });

    if (!putRes.ok) {
      const detail = await putRes.text();
      res.status(502).json({ error: `GitHub 커밋 실패 (${putRes.status})`, detail: detail.slice(0, 300) });
      return;
    }

    const result = await putRes.json();
    res.status(200).json({ ok: true, commit: result.commit && result.commit.sha });
  } catch (err) {
    res.status(500).json({ error: "GitHub 요청 중 오류가 발생했습니다.", detail: String(err).slice(0, 300) });
  }
};

// req.body가 이미 파싱돼 있으면 사용하고, 아니면 원시 스트림을 읽어 JSON 파싱
async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString("utf8");
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

// 길이 노출을 줄인 상수 시간 비교
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
