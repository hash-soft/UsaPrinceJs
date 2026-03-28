# はじめに

本リポジトリはうさぎの王子さまのプロジェクトである  
ここではうさぎの王子さまの開発とビルドを行うまでの手順を示す  
OS は Windows

# 環境準備

必要なツールをインストールしていく

## Visual Studio Code インストール(デバッグしなければ不要)

[ダウンロードサイト](https://nodejs.org/ja)から  
Windows 用のインストーラーをダウンロードしてインストール

## Node.js インストール

[Node.js のサイト](https://nodejs.org/ja)から LTS 版をダウンロードすればいいが mise を推奨
Powershellでの使用が前提となる

### mise インストール

以下コマンドでインストール

```
winget install jdx.mise
```

nodeをインストール LTS版を指定

```
mise use -g node@lts
```

このままでは npm と node が使えないためPowershellを設定する  
ここからはPowershell上で行う

```
$profile
```
出力されたパスのファイルに次を追加  
なければ作成する

```
(&mise activate pwsh) | Out-String | Invoke-Expression
```
再度Powershellを起動しスクリプトが実行されていれば npm と node が使用できるようになるが  
スクリプト実行権限がなければエラーとなるので次を行う  
  
管理者権限でPowershellを起動
```
PowerShell Set-ExecutionPolicy RemoteSigned
```
この後Powershellを起動したら npm と node が使えるようになっているはず

# ワークスペース構成

以下の役割に分かれている
|フォルダ | 役割 |
| ---- | ---- |
| ルート | ゲームの node.js プロジェクト |
| tool | csv から json 変換ツールと変換前の csv 置き場 |

# データ変換

tool 配下にある「all.bat」を実行する  
単一で変換したい場合は「all.bat」に記載の bat ファイルを実行する

変換された json ファイルは assets の以下フォルダにコピーされる

- data
- eventsets

ただし、以下の json ファイルは変換ではなく別の方法で作成する
|assets からのパス | 作成方法 |
| ---- | ---- |
| data/windows.json | json 直書き |
| data/commonScriptset.json | json 直書き |
| map/\* | TiledMapEditor で作成 |
| scriptsets/\* | 専用ツールまたは直書きで作成 |
| tilesets/\* | TiledMapEditor で作成 |

# ビルド方法

typescript を javascript にコンパイル、npm パッケージのライセンスファイルを作成する

ルートフォルダをカレントにして以下コマンドを実行する

## npm パッケージインストール

```
npm install
```

## リリース

```
npm run build
```

## デバッグ

```
npm run debug-build
```

リリースとデバッグは出力先に同一フォルダを使用しているため同時に行わないこと

## assetsについて

ライセンスの関係上画像、音声、フォントファイルは含めていない
