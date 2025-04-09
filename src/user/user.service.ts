// import { Injectable } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { User } from './user.entity';

// @Injectable()
// export class UsersService {
//   constructor(
//     @InjectRepository(User)
//     private usersRepository: Repository<User>,
//   ) {}

//   findAll(): Promise<User[]> {
//     return this.usersRepository.find();
//   }

//   addUser(user:User):Promise<User>{
  
//     return this.usersRepository.save(user)
//   }

//   findOne(id: number): Promise<User | null> {
//     return this.usersRepository.findOneBy({ id });
//   }

//   async remove(id: number): Promise<void> {
//     await this.usersRepository.delete(id);
//   }
// }



// import { PrismaService } from './prisma.service'
// import { User, Prisma } from '@prisma/client'
// import {  Prisma } from '@prisma/client'
import {  Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import {User} from 'src/user/user.entity'
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository:Repository<User>
  ) {
   
  }

  async user(
    params:{
      tgid:string
    }
  ): Promise<User | null> {
    const {tgid}=params
    return this.userRepository.findOne({
      where:{
        tgid
      }
    })
  }

  async users(params: {
    skip?: number
    take?: number
    order?:any
  }): Promise<User[]> {
    const { skip, take,order} = params
    return this.userRepository.find({
      skip,
      take,
      order
    })
  }

  async createUser(user:Partial<User>): Promise<User> {
    const newUser=this.userRepository.create(user)
    return this.userRepository.save(newUser)
  }

  async updateUser(params:Partial<User>): Promise<User> {
    const {id}=params
    await this.userRepository.update(id,{
      ...params
    })

    return this.userRepository.findOne({where:{id}})
  }

  async deleteUser(id:string): Promise<void> {
    await this.userRepository.delete(id)
  }
}
