# Tangent

**Claude Code 대화의 흐름을 깨지 않고 곁가지 질문하기**

[![test](https://github.com/closeup1202/tangent/actions/workflows/test.yml/badge.svg)](https://github.com/closeup1202/tangent/actions/workflows/test.yml)

[English](README.md) | 한국어

![문장을 골라 가지 치기를 누르고 곁가지 질문을 하면, 옆 패널에 답이 나오고 본 대화 줄기에 가지가 생깁니다](docs/demo.gif)

Claude Code 대화에서 문장을 골라 옆 패널에서 곁가지 질문을 이어 갑니다. 본 대화는 깨끗하게 남습니다.

## 빠른 시작

[Claude Code](https://code.claude.com/docs)(로그인된 상태)와 Node.js 18 이상이 필요합니다.

**1. 설치.** Claude Code 입력창에서 실행합니다.

```
/plugin install tangent --marketplace closeup1202/tangent
```

`y`를 누르고, 설치 범위는 **user**를 고릅니다. 모든 프로젝트에서 `/tg`를 쓸 수 있게 됩니다.

**2. 열기.** 아무 Claude Code 대화에서 입력합니다.

```
/tg
```

브라우저에 지금 대화가 뜹니다.

**3. 가지 치기.** 문장을 드래그하고 **가지 치기**를 누른 뒤(또는 `B`) 질문합니다.

끝입니다. 답은 옆 패널에 실시간으로 나오고, 본 대화는 그대로입니다.

## 기능

**가지 치기**
- 문장이나 메시지 전체에서 가지를 치고, 가지 안에서 다시 가지를 칠 수 있습니다.
- 가지는 고른 부분만 맥락으로 받습니다. 대화 전체를 받지 않습니다.
- 가지는 대화 줄기에 잔가지로 표시되고, 저장·이름 바꾸기·검색이 됩니다.

**질문하기**
- 스크린샷을 붙여넣거나 끌어다 놓아 질문에 첨부합니다.
- **파일 읽기**를 켜면 가지가 프로젝트 파일을 읽을 수 있습니다(읽기 전용).
- `/model`처럼 모델과 effort를 고릅니다. 기본값은 본 대화를 따라갑니다.

**배운 것 남기기**
- **노트**: 가지에서 배운 내용을 공부 노트로 정리해 PC에 마크다운으로 저장합니다(Obsidian 호환).
- **본 대화로**: 가지의 결론을 요약해, 본 대화에 붙여 넣을 수 있게 합니다.
- **내보내기**: 가지 대화를 마크다운으로 저장합니다.

**편의**
- 본 대화의 새 메시지가 실시간으로 붙습니다.
- **터미널에서 이어가기**: 가지를 일반 Claude Code 세션으로 엽니다. herdr, tmux, WezTerm, Windows Terminal, Ghostty, iTerm2를 알아봅니다.
- 단축키(`B`, `/`, `Esc`), 밝은/어두운 테마, 영어/한국어 화면을 지원합니다.

## 기본 명령과 비교

| | `/btw` | `/branch` | Tangent |
|---|---|---|---|
| 특정 문장에서 시작 | – | – | ✓ |
| 답이 남음 | – | ✓ | ✓ |
| 맥락 | 대화 전체 | 대화 전체(복사) | 고른 부분만 |
| 곁가지 여러 개를 한눈에 | – | – | ✓ |
| 가지 안에서 다시 가지 | – | – | ✓ |
| 도구 | 없음 | 전부 | 읽기 전용 선택(클릭 한 번으로 터미널 세션) |
| 결론을 본 대화로 | – | 직접 | ✓ (붙여 넣을 요약) |

## 다른 설치 방법

**셸에서:** `claude plugin install tangent --marketplace closeup1202/tangent`

**명령 이름:** 명령은 `/tg`입니다. 같은 이름의 명령이 이미 있으면 `/tangent:tg`가 됩니다.

**직접 설치(플러그인 없이):**

```bash
git clone https://github.com/closeup1202/tangent.git
cd tangent
node install.mjs
```

`~/.claude/commands/tg.md`에 `/tg` 명령을 만들고(승인 없이 실행되도록 허용), `~/.claude/tangent/launch.mjs`에 실행 진입점을 만듭니다. 설치 후 Claude Code를 다시 시작하세요. 레포를 옮겼다면 `node install.mjs`를 다시 실행합니다.

## 설정

모두 선택 사항이고, 환경변수로 지정합니다.

| 변수 | 하는 일 | 기본값 |
|---|---|---|
| `TANGENT_NOTES_DIR` | **노트** 저장 위치(예: Obsidian 볼트) | `~/Documents/Tangent Notes` |
| `TANGENT_TERMINAL` | **터미널에서 이어가기**에 쓸 명령. `{cwd}`, `{cmd}` 자리표시자를 씀. 예: `open -na Ghostty.app --args --working-directory={cwd} -e {cmd}` | 자동 감지 |
| `TANGENT_DATA` | 가지·이미지 기록 저장 위치 | `~/.claude/tangent/data` |
| `TANGENT_CLAUDE_BIN` | `claude` 실행 파일 경로(특이한 위치일 때) | `PATH`의 `claude` |
| `TANGENT_NO_OPEN` | 브라우저를 열지 않고 시작 | 없음 |

## 구조

| 파일 | 역할 |
|---|---|
| `server.mjs` | 로컬 서버. 세션 기록을 읽고, `claude -p`로 가지 대화를 실행합니다. 외부 패키지를 쓰지 않습니다. |
| `page.html` | 브라우저 화면(마크다운 렌더러 포함, 외부 CDN 없음) |
| `install.mjs` | 직접 설치할 때 `/tg` 명령 설치·제거 |
| `commands/tg.md`, `.claude-plugin/` | 플러그인 포장: `/tg` 명령, 매니페스트, 마켓플레이스 파일 |

- **원래 대화:** `~/.claude/projects/<작업 폴더>/<세션>.jsonl`을 읽기만 하고 고치지 않습니다. 처음 한 번 읽은 뒤에는 새로 붙은 부분만 읽어서, 긴 대화에서도 실시간 갱신이 빠릅니다.
- **가지 대화:** `claude -p --tools "" --strict-mcp-config`로 실행합니다(**파일 읽기**를 켜면 `--tools Read,Grep,Glob`). 첫 질문에는 `--append-system-prompt-file`로 맥락을 넣고, 이어지는 질문은 `--resume`으로 보냅니다. 가지 대화도 Claude Code 세션으로 저장되므로 구독 사용량을 씁니다.
- **가지 기록:** `~/.claude/tangent/data/`에 저장합니다. 대화 내용이 들어 있으니 레포에 넣지 않습니다.

## 개발

```bash
npm test
```

테스트는 가짜 `claude`(`test/support/fake-claude.mjs`)와 임시 폴더로 실제 Tangent 서버를 띄워서 확인합니다. 네트워크를 쓰지 않고 Claude 사용량도 들지 않습니다. CI가 Linux, macOS, Windows에서 돌립니다. 변경 내역은 [CHANGELOG.md](CHANGELOG.md)에 있습니다.

## 보안

- 서버는 `127.0.0.1`에만 열리고, 실행할 때마다 임의 토큰을 씁니다. Host와 Origin 헤더도 검사합니다. 프로젝트 폴더마다 서버는 하나만 뜹니다.
- 10분 동안 요청이 없으면 서버가 스스로 꺼집니다.
- 가지 대화에서는 파일 수정이나 명령 실행을 할 수 없습니다. 승인 창을 띄울 곳이 없기 때문입니다. **파일 읽기**를 켜면 읽기 도구만 쓰고, 승인이 필요한 동작(프로젝트 밖 파일 읽기 등)은 거부됩니다.

## 한계

- **Claude Code 내부 세션 파일 형식에 기댑니다.** 형식이 바뀌면 메시지를 못 읽을 수 있고, 그때는 빈 화면 대신 안내가 나옵니다. 형식을 읽는 코드는 `server.mjs`의 "session reading" 부분에 모아 두었습니다.
- **Windows와 macOS에서 확인했습니다.** Linux는 브라우저 쪽은 되지만, 터미널을 열지 못하면 대신 명령을 복사해 줍니다.
- Windows에서 `claude`가 npm으로 설치돼 있으면(`claude.cmd`) 셸을 거쳐 실행합니다.

## 제거

플러그인: `/plugin uninstall tangent`(셸에서는 `claude plugin uninstall tangent`)

직접 설치한 경우:

```bash
node install.mjs --uninstall          # /tg 명령과 진입점 제거 (가지 기록은 남김)
node install.mjs --uninstall --purge  # 가지 기록까지 제거
```

## 라이선스

MIT

---

Tangent는 개인 프로젝트이며 Anthropic과 관계가 없고, Anthropic이 보증하지 않습니다.
