"use strict";
/**
 * 異常値判定モジュール（段階1拡張版）
 *
 * 段階0の5条件:
 * 1. round数不一致（50未満、重複）
 * 2. 選択肢整合性NG（selectedPoemIdがchoices外）
 * 3. 極端な高速（clientElapsedMs < 200ms が5回以上）
 * 4. 極端な低速（clientElapsedMs > 60000ms が1回でも）
 * 5. 範囲外（correctCountが0〜50の範囲外）
 *
 * 段階1追加:
 * 6. 分布逸脱（極端短時間が多数など）
 * 7. ルールバージョン・閾値設定
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEGACY_CONFIG = exports.DEFAULT_CONFIG = exports.RULE_VERSION = void 0;
exports.detectAnomalies = detectAnomalies;
exports.detectAnomaliesV2 = detectAnomaliesV2;
exports.getAnomalyConfig = getAnomalyConfig;
exports.getReasonMessage = getReasonMessage;
// =============================================================================
// デフォルト設定
// =============================================================================
exports.RULE_VERSION = '1.1.0';
exports.DEFAULT_CONFIG = {
    expectedRoundCount: 50,
    minResponseMs: 200,
    maxResponseMs: 60000,
    minTotalMs: 10000, // 最低10秒
    minAvgMs: 100,
    maxFastResponses: 5,
    maxSlowResponses: 0, // 1回でもNG
    distributionCheckEnabled: true,
    distributionFastThresholdMs: 500,
    distributionFastMaxRatio: 0.3, // 30%以上が500ms未満なら異常
};
// 段階0互換の旧設定
exports.LEGACY_CONFIG = {
    expectedRoundCount: 10,
    minResponseMs: 100,
    maxResponseMs: 60000,
    minTotalMs: 2000,
    minAvgMs: 100,
    maxFastResponses: 10,
    maxSlowResponses: 0,
    distributionCheckEnabled: false,
    distributionFastThresholdMs: 500,
    distributionFastMaxRatio: 0.5,
};
// =============================================================================
// 旧API（互換性維持）
// =============================================================================
/**
 * 簡易異常値検出（旧API、段階0互換）
 */
function detectAnomalies(questionCount, correctCount, totalElapsedMs) {
    const reasons = [];
    const reasonCodes = [];
    // Rule 1: Minimum time check (2 seconds)
    if (totalElapsedMs < 2000) {
        reasons.push('回答時間が短すぎます（2秒未満）');
        reasonCodes.push('TOTAL_TIME_TOO_SHORT');
    }
    // Rule 2: correctCount range check
    if (correctCount < 0 || correctCount > questionCount) {
        reasons.push('正答数が不正です');
        reasonCodes.push('CORRECT_COUNT_OUT_OF_RANGE');
    }
    // Rule 3: questionCount must be 10 (legacy)
    if (questionCount !== 10) {
        reasons.push('問題数が10問ではありません');
        reasonCodes.push('ROUND_COUNT_MISMATCH');
    }
    // Rule 4: avgMs sanity check (minimum 100ms per question)
    const avgMs = totalElapsedMs / questionCount;
    if (avgMs < 100) {
        reasons.push('平均回答時間が短すぎます');
        reasonCodes.push('AVG_TIME_TOO_SHORT');
    }
    return {
        isValid: reasons.length === 0,
        reasons,
        reasonCodes,
        ruleVersion: '1.0.0',
    };
}
// =============================================================================
// 段階1 API
// =============================================================================
/**
 * 詳細異常値検出（段階1）
 */
function detectAnomaliesV2(rounds, correctCount, config = exports.DEFAULT_CONFIG) {
    const reasons = [];
    const reasonCodes = [];
    // 1. ラウンド数チェック
    if (rounds.length !== config.expectedRoundCount) {
        reasons.push(`ラウンド数が${config.expectedRoundCount}ではありません（${rounds.length}）`);
        reasonCodes.push('ROUND_COUNT_MISMATCH');
    }
    // 2. ラウンド重複チェック
    const roundIndices = new Set();
    for (const round of rounds) {
        if (roundIndices.has(round.roundIndex)) {
            reasons.push(`ラウンド${round.roundIndex}が重複しています`);
            reasonCodes.push('ROUND_DUPLICATE');
            break;
        }
        roundIndices.add(round.roundIndex);
    }
    // 3. 選択肢整合性チェック
    for (const round of rounds) {
        if (!round.choices.includes(round.selectedPoemId)) {
            reasons.push(`ラウンド${round.roundIndex}で選択肢外の回答があります`);
            reasonCodes.push('CHOICE_INTEGRITY_NG');
            break;
        }
    }
    // 4. 極端な高速チェック
    const fastResponses = rounds.filter((r) => r.clientElapsedMs < config.minResponseMs);
    if (fastResponses.length > config.maxFastResponses) {
        reasons.push(`極端に速い回答が多すぎます（${fastResponses.length}回、${config.minResponseMs}ms未満）`);
        reasonCodes.push('EXTREME_FAST');
    }
    // 5. 極端な低速チェック
    const slowResponses = rounds.filter((r) => r.clientElapsedMs > config.maxResponseMs);
    if (slowResponses.length > config.maxSlowResponses) {
        reasons.push(`極端に遅い回答があります（${slowResponses.length}回、${config.maxResponseMs}ms超過）`);
        reasonCodes.push('EXTREME_SLOW');
    }
    // 6. 正答数範囲チェック
    if (correctCount < 0 || correctCount > config.expectedRoundCount) {
        reasons.push(`正答数が範囲外です（${correctCount}、0-${config.expectedRoundCount}の範囲外）`);
        reasonCodes.push('CORRECT_COUNT_OUT_OF_RANGE');
    }
    // 7. 合計時間チェック
    const totalElapsedMs = rounds.reduce((sum, r) => sum + r.clientElapsedMs, 0);
    if (totalElapsedMs < config.minTotalMs) {
        reasons.push(`合計回答時間が短すぎます（${totalElapsedMs}ms、最低${config.minTotalMs}ms）`);
        reasonCodes.push('TOTAL_TIME_TOO_SHORT');
    }
    // 8. 平均時間チェック
    const avgMs = totalElapsedMs / rounds.length;
    if (avgMs < config.minAvgMs) {
        reasons.push(`平均回答時間が短すぎます（${Math.round(avgMs)}ms）`);
        reasonCodes.push('AVG_TIME_TOO_SHORT');
    }
    // 9. 分布異常チェック（段階1追加）
    if (config.distributionCheckEnabled) {
        const veryFastResponses = rounds.filter((r) => r.clientElapsedMs < config.distributionFastThresholdMs);
        const fastRatio = veryFastResponses.length / rounds.length;
        if (fastRatio > config.distributionFastMaxRatio) {
            reasons.push(`回答時間の分布が異常です（${Math.round(fastRatio * 100)}%が${config.distributionFastThresholdMs}ms未満）`);
            reasonCodes.push('DISTRIBUTION_ANOMALY');
        }
    }
    return {
        isValid: reasons.length === 0,
        reasons,
        reasonCodes,
        ruleVersion: exports.RULE_VERSION,
    };
}
/**
 * 設定を取得（将来的にFirestoreから読み込み可能に）
 */
function getAnomalyConfig(isOfficial = true) {
    // 将来的にはFirestoreから動的に読み込む
    return isOfficial ? exports.DEFAULT_CONFIG : exports.LEGACY_CONFIG;
}
/**
 * 無効理由コードから人間可読なメッセージを取得
 */
function getReasonMessage(code) {
    const messages = {
        ROUND_COUNT_MISMATCH: 'ラウンド数が正しくありません',
        ROUND_DUPLICATE: 'ラウンドが重複しています',
        CHOICE_INTEGRITY_NG: '選択肢の整合性エラー',
        EXTREME_FAST: '極端に速い回答があります',
        EXTREME_SLOW: '極端に遅い回答があります',
        CORRECT_COUNT_OUT_OF_RANGE: '正答数が範囲外です',
        DISTRIBUTION_ANOMALY: '回答時間の分布が異常です',
        TOTAL_TIME_TOO_SHORT: '合計回答時間が短すぎます',
        AVG_TIME_TOO_SHORT: '平均回答時間が短すぎます',
    };
    return messages[code] || '不明なエラー';
}
//# sourceMappingURL=anomalyDetector.js.map