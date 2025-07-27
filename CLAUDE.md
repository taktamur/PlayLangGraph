# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要
LangGraphを使ったDenoプロジェクトの学習・実験用リポジトリです。LangGraphは状態を持つマルチエージェントアプリケーションを構築するためのJavaScript/TypeScriptライブラリです。

## 開発環境とコマンド
- **ランタイム**: Deno
- **サンプル実行**: `deno run --allow-all <ファイル名>.ts`
- **開発実行**: `deno task dev` (main.tsを実行)
- **依存関係**: `@langchain/langgraph@^0.2.73`, `zod@^3.23.8`

## ファイル命名規則
- ワンライナーやテスト用ファイル: `tmp_*.ts` (tmp/ディレクトリに配置)
- サンプルファイル: `数字_説明.ts` 形式（例: `1_simple_two_nodes.ts`）

## アーキテクチャパターン
- **StateGraph**: 状態を共有するワークフロー定義に使用
- **ノード**: ビジネスロジックを実装する関数
- **エッジ**: ノード間の実行順序を定義
- **状態管理**: channelsオブジェクトで状態の更新方法を定義（レガシー方式）
- **Annotation.Root**: 最新の推奨方式による状態定義（channelsが不要）

## 学習サンプルの構成
1. `1_simple_two_nodes.ts`: StateGraphの基本概念（channels方式）
2. `2_loop_sample.ts`: 条件付きエッジとループ処理（channels + Zod）
3. `3_annotation_sample.ts`: Annotation.Root方式の最新実装

## ユーティリティライブラリ
- `lib/graph-utils.ts`: グラフ画像生成のヘルパー関数
  - `saveGraphAsPng()`: 簡単にPNG画像として保存

## 実行権限
Denoでは以下の権限が必要な場合があります：
- `--allow-net`: ネットワークアクセス（グラフ画像生成時）
- `--allow-write`: ファイル書き込み（PNG画像保存時）
- `--allow-env`: 環境変数アクセス

## サンプルコードの特徴
- 日本語コメントでの詳細な説明
- 型安全性を重視したTypeScript実装
- グラフの可視化機能（PNG画像生成）
- ログ出力による実行過程の追跡