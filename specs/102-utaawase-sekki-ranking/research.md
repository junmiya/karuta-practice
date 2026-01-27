# Research: 歌合・節気別歌位確定システム

**Feature**: 102-utaawase-sekki-ranking
**Date**: 2026-01-27

## R-001: ルールセット格納方式

**Decision**: Firestore document (`rulesets/current`) に `yamlContent` (string) + `rules` (parsed JSON map) として保存

**Rationale**: ルールセットは数KB程度で、Firestoreドキュメントサイズ上限(1MB)に収まる。Cloud Storageは不要な複雑性を追加する。YAML原文を保持しつつ、パース済みデータも格納することで読み込み時のYAMLパースを省略できる。

**Alternatives**:
- Cloud Storage (YAML file) → 読み込みにGCS SDK必要、コスト増
- Firestore subcollection (level別ドキュメント) → 過度な正規化

## R-002: 節気カレンダー外部API

**Decision**: 国立天文台(NAOJ)の暦要項データを参考にハードコード + admin手動入力UI

**Rationale**: 節気日時の公開APIは限られており、信頼性の高い無料APIが少ない。NAOJは毎年2月に翌年の暦要項を公開するが、APIではなくPDF/HTML形式。現実的にはNAOJデータを参考に管理画面から手動入力するのが最も確実。将来的にスクレイピングや外部APIが利用可能になれば `fetchSekki()` を拡張可能。

**Alternatives**:
- 天文計算ライブラリ(meeus等) → 精度は十分だがスコープ外の複雑性
- 外部天文API (sunrise-sunset.org等) → 節気非対応

## R-003: スコア集計方式

**Decision**: シーズン内ベスト3回合計によるランキング

**Rationale**: ユーザーの回答(Q4)で「ベストN回合計」を選択、N=3と指定。上位3回のスコアを合計することで、安定した実力を反映しつつ、参加回数の多寡による不公平を軽減する。

**Alternatives**:
- 累積スコア(全回合計) → 参加回数が多いほど有利、質より量
- ベストスコア(1回) → 1回の好結果で確定、継続性が低い
- 平均スコア → 参加回数が少ないユーザーに有利

## R-004: matchイベント自動生成タイミング

**Decision**: `submitOfficialSession` Cloud Function内でセッション確定後に自動生成

**Rationale**: 既存の公式競技フローを変更せず、確定処理の延長としてイベントを生成する。OfficialPageの変更は不要で、バックエンドのみの修正で済む。

**Alternatives**:
- Firestore trigger (onWrite) → 二重書き込みリスク
- バッチ処理(日次) → リアルタイム性が低い

## R-005: 既存システムからの移行方式

**Decision**: Parallel write → Migration script → Frontend cutover → Archive

**Rationale**: 段階的移行によりリスクを最小化。並行書き込み期間中はデータ整合性を確認でき、問題があればロールバック可能。

**Alternatives**:
- Big bang cutover → リスク高、ロールバック困難
- 永久並行運用 → 保守コスト倍増
