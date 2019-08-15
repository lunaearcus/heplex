# heplex
Tanita の Health Planet からデータをエクスポートして Google Fit に登録したい気持ちのプロジェクト

## Summary
- Health Planet から data シートにデータを取得
    - Date 列の最後より新しいデータを取得
- Process 列が空の体重について Google Fit に送信
- エラーハンドリングは適当というかほぼしていないので注意

## Data Export
### API Spec.
https://www.healthplanet.jp/apis/api.html

### Credentials
スクリプトのプロパティに下記を設定
- HEALTH_PLANET_CLIENT_ID
- HEALTH_PLANET_CLIENT_SECRET

### Note
認可リクエスト時のクエリストリングに含まれる state パラメータを保持してくれないため、下記の手順が必要
- 事前に state をコピーしておく
- Authorization Code が渡されるリクエスト（Google のエラー画面）で URL に下記を付与して再リクエスト
```
&state={コピーしておいた state}
```

### Sheet
- data という名前のシートを作成して追記

## Data Import
### GCP Project
- Standard Project を作成して紐づけが必要
- 同意画面でアプリケーション名のみ設定
- Fitness API を有効化

### Private Info.
スクリプトのプロパティに下記を設定
- SCALE_UID
