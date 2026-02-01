import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @Column({ nullable: true })
  role_id: string;

  @Column()
  title: string;

  @Column()
  message: string;

  @Column({
    enum: ['task-assign', 'task-invitation', 'task-rejected', 'task-approved'],
  })
  type: 'task-assign' | 'task-invitation' | 'task-rejected' | 'task-approved';

  @Column({ default: false })
  is_read: boolean;

  @Column({ default: false })
  is_actionable: boolean;

  @Column({ nullable: true })
  action_url: string;

  @Column({ nullable: true })
  created_by: string;

  @Column({ nullable: true })
  updated_by: string;

  @CreateDateColumn()
  created_date: Date;

  @UpdateDateColumn()
  updated_date: Date;
}
