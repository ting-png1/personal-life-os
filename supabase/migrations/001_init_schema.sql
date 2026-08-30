-- ============================================================
-- Personal Life OS - 数据库初始化脚本
-- 版本: v1.0
-- 日期: 2026-08-30
-- 说明: 创建 4 张业务表 + RLS 行级安全策略 + 索引
-- ============================================================

-- ============================================================
-- 1. todos 表 - 待办事项
-- ============================================================
CREATE TABLE IF NOT EXISTS public.todos (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON public.todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON public.todos(due_date);
CREATE INDEX IF NOT EXISTS idx_todos_completed ON public.todos(completed);
CREATE INDEX IF NOT EXISTS idx_todos_priority ON public.todos(priority);
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON public.todos(created_at);
CREATE INDEX IF NOT EXISTS idx_todos_updated_at ON public.todos(updated_at);
CREATE INDEX IF NOT EXISTS idx_todos_deleted_at ON public.todos(deleted_at);

-- RLS 行级安全
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own todos"
    ON public.todos FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own todos"
    ON public.todos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own todos"
    ON public.todos FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own todos"
    ON public.todos FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- 2. schedule_events 表 - 日程/课程
-- ============================================================
CREATE TABLE IF NOT EXISTS public.schedule_events (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    start_date_time TIMESTAMPTZ NOT NULL,
    end_date_time TIMESTAMPTZ NOT NULL,
    type TEXT NOT NULL DEFAULT 'personal' CHECK (type IN ('class', 'personal', 'rest', 'other')),
    location TEXT,
    note TEXT,
    recurrence JSONB,
    recurrence_exceptions JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_schedule_events_user_id ON public.schedule_events(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_type ON public.schedule_events(type);
CREATE INDEX IF NOT EXISTS idx_schedule_events_start_date_time ON public.schedule_events(start_date_time);
CREATE INDEX IF NOT EXISTS idx_schedule_events_created_at ON public.schedule_events(created_at);
CREATE INDEX IF NOT EXISTS idx_schedule_events_updated_at ON public.schedule_events(updated_at);
CREATE INDEX IF NOT EXISTS idx_schedule_events_deleted_at ON public.schedule_events(deleted_at);

-- RLS 行级安全
ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own schedule events"
    ON public.schedule_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own schedule events"
    ON public.schedule_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schedule events"
    ON public.schedule_events FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schedule events"
    ON public.schedule_events FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- 3. mood_records 表 - 情绪记录
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mood_records (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 5),
    tags TEXT[] DEFAULT '{}',
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_mood_records_user_id ON public.mood_records(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_records_date ON public.mood_records(date);
CREATE INDEX IF NOT EXISTS idx_mood_records_level ON public.mood_records(level);
CREATE INDEX IF NOT EXISTS idx_mood_records_created_at ON public.mood_records(created_at);
CREATE INDEX IF NOT EXISTS idx_mood_records_updated_at ON public.mood_records(updated_at);
CREATE INDEX IF NOT EXISTS idx_mood_records_deleted_at ON public.mood_records(deleted_at);

-- RLS 行级安全
ALTER TABLE public.mood_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mood records"
    ON public.mood_records FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mood records"
    ON public.mood_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mood records"
    ON public.mood_records FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mood records"
    ON public.mood_records FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- 4. period_records 表 - 生理周期记录
-- ============================================================
CREATE TABLE IF NOT EXISTS public.period_records (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    flow_level TEXT CHECK (flow_level IN ('light', 'medium', 'heavy')),
    symptoms TEXT[] DEFAULT '{}',
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_period_records_user_id ON public.period_records(user_id);
CREATE INDEX IF NOT EXISTS idx_period_records_start_date ON public.period_records(start_date);
CREATE INDEX IF NOT EXISTS idx_period_records_end_date ON public.period_records(end_date);
CREATE INDEX IF NOT EXISTS idx_period_records_created_at ON public.period_records(created_at);
CREATE INDEX IF NOT EXISTS idx_period_records_updated_at ON public.period_records(updated_at);
CREATE INDEX IF NOT EXISTS idx_period_records_deleted_at ON public.period_records(deleted_at);

-- RLS 行级安全
ALTER TABLE public.period_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own period records"
    ON public.period_records FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own period records"
    ON public.period_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own period records"
    ON public.period_records FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own period records"
    ON public.period_records FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- 5. updated_at 自动更新触发器
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_todos_updated_at
    BEFORE UPDATE ON public.todos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schedule_events_updated_at
    BEFORE UPDATE ON public.schedule_events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mood_records_updated_at
    BEFORE UPDATE ON public.mood_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_period_records_updated_at
    BEFORE UPDATE ON public.period_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
