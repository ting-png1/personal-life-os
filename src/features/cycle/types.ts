// ============================================================
// Cycle Domain Types
// 生理周期模块的领域模型
// 注意：不做医疗诊断，仅基于历史数据做预测和展示
// ============================================================

/** 经期记录 — 每次经期的开始和结束 */
export interface PeriodRecord {
  id: string;                    // UUID，客户端生成
  startDate: string;             // "YYYY-MM-DD" 经期开始日
  endDate: string | null;        // "YYYY-MM-DD" 经期结束日；null=进行中
  flowLevel: FlowLevel | null;    // 经量；null=未记录
  symptoms: string[];            // 症状标签，如 ["痛经", "腰酸", "头痛"]
  note: string | null;           // 备注
  createdAt: string;             // ISO 时间戳
  updatedAt: string;             // ISO 时间戳
}

/** 经量等级 */
export type FlowLevel = 1 | 2 | 3;  // 1=少, 2=中, 3=多

/** 周期阶段 */
export type CyclePhase = 'period' | 'follicular' | 'ovulation' | 'luteal';

/** 创建经期记录的输入（不含系统字段） */
export interface CreatePeriodInput {
  startDate: string;
  endDate?: string | null;
  flowLevel?: FlowLevel | null;
  symptoms?: string[];
  note?: string | null;
}

/** 更新经期记录的输入（部分字段） */
export type UpdatePeriodInput = Partial<Omit<PeriodRecord, 'id' | 'createdAt'>>;

/** 派生的当前周期状态（不存库，由 CycleCalculator 计算） */
export interface CurrentCycleState {
  isInPeriod: boolean;            // 是否正在经期
  currentPhase: CyclePhase | null; // 当前阶段；数据不足时 null
  periodDay: number | null;       // 经期第几天；不在经期时 null
  daysUntilNextPeriod: number | null;  // 距下次经期天数；无法预测时 null
  nextPeriodDate: string | null;  // 预测下次经期开始日
  ovulationDate: string | null;   // 预测排卵日
  fertileWindow: { start: string; end: string } | null;  // 可孕窗口
  isDelayed: boolean;             // 是否推迟
  delayDays: number;              // 推迟天数（0=未推迟）
  averageCycleLength: number | null;  // 平均周期长度（天）
  averagePeriodLength: number | null;  // 平均经期长度（天）
  recordedCycles: number;         // 已记录的完整周期数
  recordCount: number;             // 已记录的经期次数
  hasEnoughData: boolean;         // 是否有足够数据做预测（至少 2 个完整周期）
  currentPeriodRecord: PeriodRecord | null;  // 当前进行中的经期记录
}

/** 单个周期的统计信息（派生，不存库） */
export interface CycleStats {
  cycleNumber: number;
  periodStartDate: string;
  periodEndDate: string | null;
  nextPeriodStartDate: string | null;
  cycleLength: number | null;     // 周期长度（天）
  periodLength: number | null;    // 经期长度（天）
  ovulationDate: string | null;
  fertileWindowStart: string | null;
  fertileWindowEnd: string | null;
}
