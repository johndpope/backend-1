# pocket-cards-backend

| Status      | Path                           | Http Method | Function ID | Comment                |
| ----------- | ------------------------------ | ----------- | ----------- | ---------------------- |
|             | /regist                        | POST        | A001        | ユーザ登録             |
|             | /login                         | POST        | A002        | ユーザログイン         |
|             | /groups                        | POST        | B001        | グループ登録           |
|             | /groups/{groupId}              | GET         | B002        | グループ情報取得       |
|             | /groups/{groupId}              | PUT         | B003        | グループ情報変更       |
|             | /groups/{groupId}              | DELETE      | B004        | グループ情報削除       |
|             | /groups/{groupId}/words        | POST        | C001        | 単語一括登録           |
| **Deleted** | /groups/{groupId}/words        | GET         | C002        | 単語一覧取得           |
|             | /groups/{groupId}/words/{word} | GET         | C003        | 単語情報取得           |
|             | /groups/{groupId}/words/{word} | PUT         | C004        | 単語情報更新           |
|             | /groups/{groupId}/words/{word} | DELETE      | C005        | 単語情報削除           |
|             | /groups/{groupId}/new          | GET         | C006        | 新規学習モード単語一覧 |
|             | /groups/{groupId}/test         | GET         | C007        | テストモード単語一覧   |
|             | /groups/{groupId}/review       | GET         | C008        | 復習モード単語一覧     |
|             | /image2text                    | POST        | D001        | 画像から単語に変換する |
| **Deleted** | /speech                        | GET         | D002        | word to speech         |
|             | dynaomdb stream                |             | S001        | 履歴テーブルに保存する |

## Search Conditions

### UserInfo

| Key      | Describe       |
| -------- | -------------- |
| userId   | HashKey        |
| target   | 毎日単語目標数 |
| email    | メールアドレス |
| nickName | 名前           |

| Status        | Conditions   |
| ------------- | ------------ |
| User Settings | UserId = xxx |

### GroupInfo

| Key       | Describe   |
| --------- | ---------- |
| userId    | HashKey    |
| groupId   | RangeKey   |
| groupName | グループ名 |

| Key     | Describe      |
| ------- | ------------- |
| groupId | HashKey (GSI) |
| userId  |               |

| Status             | Conditions                  | Index |
| ------------------ | --------------------------- | ----- |
| Get Group Settings | UserId = xxx, GroupId = xxx |       |
| Get UserId         | GroupId = xxx               | GSI   |

## GroupWords

### Normal Definition

| Key      | Describe |
| -------- | -------- |
| groupId  | HashKey  |
| word     | RangeKey |
| nextTime |          |
| lastTime |          |
| times    |          |

### LSI Definition

| Key      | Describe    |
| -------- | ----------- |
| groupId  | Hash        |
| nextTime | Range (LSI) |
| nextTime |             |
| lastTime |             |
| times    |             |

### Search Conditions

| Status         | Conditions                                             |
| -------------- | ------------------------------------------------------ |
| New Targets    | Times = 0, NextTime <= now, NextTime ASC               |
| New Success    | Times = Times + 1, LastTime = now , NextTime = now ASC |
| Review Targets | Times = 1                                              |
| Test Targets   | Times <> 0, NextTime <= now                            |
| Test Success   | Times = Times + 1, LastTime = now, NextTime = now + x  |
| Test Failure   | Times = 0, LastTime = now, NextTime = now              |

## WordDict

### Normal Definition

| Key       | Describe   |
| --------- | ---------- |
| word      | HashKey    |
| mp3       | 音声データ |
| pronounce | 発音記号   |
| ja        | 日本語翻訳 |
| zh        | 中国語翻訳 |

### Search Conditions

| Status   | Conditions |
| -------- | ---------- |
| Get Word | Word = xxx |
| Put Word | Word = xxx |

## Histroy

### Normal Definition

| Key       | Describe |
| --------- | -------- |
| userId    | HashKey  |
| timestamp | RangeKey |
| word      | 単語     |
| times     | 学習回数 |

### Search Conditions

| Status      | Conditions                                  |
| ----------- | ------------------------------------------- |
| Get Daily   | UserId = xxx, Timestamp begin_with YYYYMMDD |
| Get Weekly  | UserId = xxx, Timestamp >= YYYYMMDD         |
| Get Monthly | UserId = xxx, Timestamp >= YYYYMMDD         |
| Put Word    | Word = xxx                                  |
