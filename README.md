# korean_impulse

임펄스 코리아 정적 페이지입니다. Django 앱(`impulse-korea`)과 분리된 GitHub Pages용 레포입니다.

## 로컬 확인

```bash
python3 -m http.server 4173
```

브라우저에서 `http://127.0.0.1:4173` 을 엽니다.

## 데이터

`data/impulse.json` 을 바꾸면 화면이 갱신됩니다.

- `nav`: 일자별 IMPULSE 평가액(`nav`)과 KOSPI 비교값(`benchmark`)
- `holdings`: 일자별 보유 종목. `ticker`, `name`, `value`

## GitHub Pages

`main`에 푸시하면 `.github/workflows/pages.yml` 이 Pages로 배포합니다.

레포 Settings → Pages → Source 를 **GitHub Actions** 로 한 번 지정해야 합니다. 배포 주소는 `https://kimbs94.github.io/korean_impulse/` 입니다.
