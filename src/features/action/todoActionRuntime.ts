import { nowISO } from '../../shared/lib/date.ts'
import { generateId } from '../../shared/lib/id.ts'
import { todoRepository } from '../todo/repository.ts'
import { actionAuditRepository } from './auditRepository.ts'
import type { TodoActionExecutorDependencies } from './services/TodoActionExecutor.ts'

/** Local-First application adapter; Intelligence only receives proposals/results. */
export const localTodoActionRuntime: TodoActionExecutorDependencies = {
  todo: todoRepository,
  audit: actionAuditRepository,
  now: nowISO,
  generateExecutionId: generateId,
}
