# GameJam-Prep

헥사 타일 위에서 진행되는 오토배틀 RPG 게임잼 기획 작업 공간.

## Status

이전 프로토타입과 기획 방향은 폐기했다.

현재 레포는 기획 문서와 모바일 세로형 오토배틀 프로토타입을 함께 갱신한다.

## Planning Docs

- [시작점](docs/00-start-here.md)
- [게임 콘셉트](docs/01-game-concept.md)
- [스테이지와 웨이브 구조](docs/03-stage-wave-structure.md)
- [캐릭터와 스탯](docs/04-combatants-and-stats.md)
- [덱과 카드 시스템](docs/05-deck-and-card-system.md)
- [턴 진행](docs/06-turn-flow.md)
- [액션 규칙](docs/07-action-rules.md)
- [캐릭터 덱 구성](docs/08-character-decks.md)
- [보상과 빌드 루트](docs/09-rewards-and-build-routes.md)
- [리스크와 추후 결정](docs/10-risks-and-later-decisions.md)
- [맵 오브젝트와 시야](docs/11-map-objects-and-vision.md)
- [상태 효과와 전투 효과](docs/12-status-and-combat-effects.md)
- [몬스터 기획](docs/13-monsters.md)
- [UI 아이콘과 이미지 필요 목록](docs/14-ui-icons-and-assets.md)
- [궁수 캐릭터](docs/characters/archer.md)
- [전사 캐릭터](docs/characters/warrior.md)
- [마법사 캐릭터](docs/characters/mage.md)
- [기획 결정 기록](docs/02-design-decisions.md)
- [아카이브 노트](docs/99-archive-notes.md)

## GitHub Pages

현재 루트의 `index.html`을 열면 궁수 오토배틀 프로토타입을 실행할 수 있다.

## Testing Note

프로토타입 UI 확인은 GitHub Pages에 반영된 배포 화면을 기준으로 한다.

로컬 브라우저 자동화나 임시 정적 서버는 문법/응답 확인 보조 용도로만 사용하고, 최종 화면 판단은 GitHub Pages에서 직접 테스트한다.

모바일 전체화면 테스트는 일반 브라우저 탭이 아니라 홈 화면 앱 실행을 기준으로 한다. iPhone에서는 Safari로 GitHub Pages를 연 뒤 공유 버튼에서 `홈 화면에 추가`를 선택하고, 생성된 홈 화면 아이콘으로 실행한다. 이 방식으로 열어야 주소창과 하단 브라우저 툴바 없이 테스트할 수 있다.
