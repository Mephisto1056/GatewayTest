import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private organizationsRepository: Repository<Organization>,
  ) {}

  async findOne(id: number): Promise<Organization | null> {
    return this.organizationsRepository.findOneBy({ id });
  }

  async findOneByName(name: string): Promise<Organization | null> {
    return this.organizationsRepository.findOneBy({ name });
  }

  async create(name: string): Promise<Organization> {
    const organization = this.organizationsRepository.create({ name });
    return this.organizationsRepository.save(organization);
  }

  async findOrCreate(name: string): Promise<Organization> {
    let organization = await this.findOneByName(name);
    if (!organization) {
      organization = await this.create(name);
    }
    return organization;
  }
  
  async findAll(): Promise<Organization[]> {
    return this.organizationsRepository.find();
  }
}