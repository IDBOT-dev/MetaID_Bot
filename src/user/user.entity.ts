
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user')
export class User{

    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    tgid: string;
  
    @Column({type:'integer'})
    mneid: number;
  
    @Column({type: 'integer',})
    path: number;

    @Column({default:'Tg'})
    source: string;

}