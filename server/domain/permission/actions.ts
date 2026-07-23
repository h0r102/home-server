export type Action =
  | 'aircon.view'
  | 'aircon.operate'
  | 'sensor.view'
  | 'list.create'
  | 'list.rename'
  | 'list.delete'
  | 'list.share.manage'
  | 'list.item.create'
  | 'list.item.edit'
  | 'list.item.toggle'
  | 'list.item.delete'
  | 'list.item.reorder'
  | 'user.manage'
  | 'auditlog.view';

export interface ListResourceContext {
  ownerId: string;
  shares: Array<{ userId: string; permission: 'VIEW' | 'EDIT' }>;
}
