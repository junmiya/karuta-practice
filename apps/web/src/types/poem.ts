export interface Poem {
  poemId: string; // p001-p100 or poem_001-poem_100
  order: number; // 1-100
  yomi: string; // 上の句 (reading card text)
  yomiKana: string; // Yomi reading in hiragana
  tori: string; // 下の句 (taking card text)
  toriKana: string; // Tori reading in hiragana
  yomiTokens: string[]; // 上の句（改行用トークン）
  yomiKanaTokens: string[]; // 上の句ひらがな（改行用）
  toriTokens: string[]; // 下の句（改行用トークン）
  toriKanaTokens: string[]; // 下の句ひらがな（改行用）
  yomiNoSpace: string; // 上の句（スペースなし）
  yomiKanaNoSpace: string; // 上の句ひらがな（スペースなし）
  toriNoSpace: string; // 下の句（スペースなし）
  toriKanaNoSpace: string; // 下の句ひらがな（スペースなし）
  kimariji: string; // 決まり字 (decisive syllables)
  kimarijiCount: number; // Number of decisive syllables (1-6)
  author: string; // Poet name (歌人)
}
