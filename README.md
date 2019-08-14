# heplex
Tanita の Health Planet からデータをエクスポートして Google Fit に登録したい気持ちのプロジェクト

## Data Export
### API Spec.
https://www.healthplanet.jp/apis/api.html

### Note
認可リクエスト時のクエリストリングに含まれる state パラメータを保持してくれないため、下記の手順が必要
- 事前に state をコピーしておく
- Authorization Code が渡されるリクエスト（Google のエラー画面）で URL に下記を付与して再リクエスト
```
&state={コピーしておいた state}
```

### Sheet
- data という名前のシートを作成して追記
