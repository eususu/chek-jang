#!/bin/bash
#
# 소설 작성 API 테스트 스크립트
# 사용법: ./test-api.sh
#

BASE_URL="http://localhost:3000"
TOKEN="your_auth_token_here"

# 색상
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass=0
fail=0

call() {
  local method=$1 path=$2 body=$3
  local args=(-s -w "\n%{http_code}" -X "$method" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
  [[ -n "$body" ]] && args+=(-d "$body")
  curl "${args[@]}" "${BASE_URL}${path}"
}

check() {
  local label=$1 expected=$2 response=$3
  local code
  code=$(echo "$response" | tail -1)
  local body
  body=$(echo "$response" | sed '$d')

  if [[ "$code" == "$expected" ]]; then
    echo -e "${GREEN}✓ ${label} [${code}]${NC}"
    ((pass++))
  else
    echo -e "${RED}✗ ${label} — expected ${expected}, got ${code}${NC}"
    echo "  $body"
    ((fail++))
  fi
  echo "$body"
}

id_from() { echo "$1" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2; }

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  소설 작성 API 테스트${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# ── 인증 테스트 ──────────────────────────────
echo -e "${YELLOW}▸ 인증 테스트${NC}"

res=$(curl -s -w "\n%{http_code}" "${BASE_URL}/novels")
check "토큰 없이 요청 → 401" 401 "$res"
echo ""

# ── 소설 CRUD ────────────────────────────────
echo -e "${YELLOW}▸ 소설 CRUD${NC}"

res=$(call POST /novels '{"title":"테스트 소설","description":"curl 테스트용 소설입니다"}')
body=$(check "소설 생성" 201 "$res")
NOVEL_ID=$(id_from "$body")
echo "  → novel_id = $NOVEL_ID"
echo ""

res=$(call GET /novels)
check "소설 목록 조회" 200 "$res" > /dev/null
echo ""

res=$(call GET "/novels/${NOVEL_ID}")
check "소설 상세 조회" 200 "$res" > /dev/null
echo ""

res=$(call PUT "/novels/${NOVEL_ID}" '{"title":"수정된 소설 제목"}')
check "소설 수정" 200 "$res" > /dev/null
echo ""

# ── 챕터 CRUD ────────────────────────────────
echo -e "${YELLOW}▸ 챕터 CRUD${NC}"

res=$(call POST "/novels/${NOVEL_ID}/chapters" '{"title":"1장: 시작","content":"옛날 옛적에..."}')
body=$(check "챕터 1 생성" 201 "$res")
CH1_ID=$(id_from "$body")
echo "  → chapter_id = $CH1_ID"
echo ""

res=$(call POST "/novels/${NOVEL_ID}/chapters" '{"title":"2장: 전개","content":"그러던 어느 날..."}')
body=$(check "챕터 2 생성" 201 "$res")
CH2_ID=$(id_from "$body")
echo "  → chapter_id = $CH2_ID"
echo ""

res=$(call POST "/novels/${NOVEL_ID}/chapters" '{"title":"3장: 결말","content":"그리고 행복하게 살았습니다."}')
body=$(check "챕터 3 생성" 201 "$res")
CH3_ID=$(id_from "$body")
echo "  → chapter_id = $CH3_ID"
echo ""

res=$(call GET "/novels/${NOVEL_ID}/chapters/${CH1_ID}")
check "챕터 조회" 200 "$res" > /dev/null
echo ""

res=$(call PUT "/novels/${NOVEL_ID}/chapters/${CH1_ID}" '{"title":"1장: 새로운 시작"}')
check "챕터 수정" 200 "$res" > /dev/null
echo ""

# ── 챕터 순서 변경 ───────────────────────────
echo -e "${YELLOW}▸ 챕터 순서 변경${NC}"

res=$(call PUT "/novels/${NOVEL_ID}/chapters/reorder" "{\"chapterIds\":[${CH3_ID},${CH1_ID},${CH2_ID}]}")
check "챕터 순서 변경" 200 "$res" > /dev/null
echo ""

# ── 삭제 ─────────────────────────────────────
echo -e "${YELLOW}▸ 삭제${NC}"

res=$(call DELETE "/novels/${NOVEL_ID}/chapters/${CH3_ID}")
check "챕터 삭제" 204 "$res" > /dev/null
echo ""

res=$(call DELETE "/novels/${NOVEL_ID}")
check "소설 삭제 (cascade)" 204 "$res" > /dev/null
echo ""

# ── 에러 케이스 ──────────────────────────────
echo -e "${YELLOW}▸ 에러 케이스${NC}"

res=$(call GET "/novels/99999")
check "존재하지 않는 소설 → 404" 404 "$res" > /dev/null
echo ""

res=$(call POST /novels '{}')
check "빈 body로 소설 생성 → 400" 400 "$res" > /dev/null
echo ""

res=$(call POST /novels '{"title":""}')
check "빈 title로 소설 생성 → 400" 400 "$res" > /dev/null
echo ""

# ── 결과 ─────────────────────────────────────
echo -e "${CYAN}========================================${NC}"
echo -e "  통과: ${GREEN}${pass}${NC}  실패: ${RED}${fail}${NC}"
echo -e "${CYAN}========================================${NC}"

[[ $fail -eq 0 ]] && exit 0 || exit 1
