
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tx')
export class Tx{

    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    tgid: string;
  
    @Column()
    address: string;

    @Column({default:'Tg'})
    source: string;

    @Column({default:'mvc'})
    chain: string;

    @Column({unique:true})
    txid:string

    @Column()
    pinid:string

}