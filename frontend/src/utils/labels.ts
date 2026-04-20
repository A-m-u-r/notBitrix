export const reqStatusLabel: Record<string, string> = {
  draft: 'Черновик', review: 'На проверке', approved: 'Утверждено',
  implemented: 'Реализовано', verified: 'Проверено', rejected: 'Отклонено'
}
export const reqStatusType: Record<string, string> = {
  draft: 'info', review: 'warning', approved: 'success',
  implemented: 'primary', verified: 'success', rejected: 'danger'
}
export const priorityLabel: Record<string, string> = {
  critical: 'Критический', high: 'Высокий', medium: 'Средний', low: 'Низкий'
}
export const priorityType: Record<string, string> = {
  critical: 'danger', high: 'warning', medium: 'primary', low: 'info'
}
export const typeLabel: Record<string, string> = {
  functional: 'Функциональное', non_functional: 'Нефункциональное',
  business: 'Бизнес', constraint: 'Ограничение'
}
export const taskStatusLabel: Record<string, string> = {
  backlog: 'Бэклог', todo: 'К выполнению', in_progress: 'В работе',
  review: 'На проверке', done: 'Готово'
}
export const taskStatusType: Record<string, string> = {
  backlog: 'info', todo: 'warning', in_progress: 'primary', review: 'warning', done: 'success'
}
export const bugStatusLabel: Record<string, string> = {
  open: 'Открыт', in_progress: 'В работе', resolved: 'Решён',
  closed: 'Закрыт', wont_fix: 'Не будет исправлен'
}
export const bugStatusType: Record<string, string> = {
  open: 'danger', in_progress: 'warning', resolved: 'success',
  closed: 'info', wont_fix: 'info'
}
export const severityLabel: Record<string, string> = {
  blocker: 'Блокер', critical: 'Критический', major: 'Мажорный',
  normal: 'Нормальный', minor: 'Минорный', trivial: 'Тривиальный'
}
export const severityType: Record<string, string> = {
  blocker: 'danger', critical: 'danger', major: 'warning',
  normal: 'primary', minor: 'info', trivial: 'info'
}
export const sprintStatusLabel: Record<string, string> = {
  planned: 'Запланирован', active: 'Активный', completed: 'Завершён'
}
export const sprintStatusType: Record<string, string> = {
  planned: 'info', active: 'success', completed: ''
}
export const roleLabel: Record<string, string> = {
  Admin: 'Администратор', Director: 'Директор', TeamLead: 'Тимлид',
  Developer: 'Разработчик', Analyst: 'Аналитик', QA: 'QA'
}
