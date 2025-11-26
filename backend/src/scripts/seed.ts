import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const organizationsService = app.get(OrganizationsService);

  // Create default organization
  const defaultOrg = await organizationsService.findOrCreate('Default Organization');

  const admin = {
    name: 'Admin User',
    email: 'admin@gateway.com',
    password: 'adminpassword',
    role: 'admin',
    organizationId: defaultOrg.id,
    organization: defaultOrg,
  };

  // Handle Admin User
  const existingAdmin = await usersService.findOneByEmail(admin.email);
  if (existingAdmin) {
    // Ensure admin is not deleted/reset, just update if needed
    // Note: In a real scenario, you might want to skip updating password if not intended
    await usersService.update(existingAdmin.id, admin);
    console.log('Admin user updated/verified successfully.');
  } else {
    try {
      await usersService.create(admin);
      console.log('Admin user created successfully.');
    } catch (error) {
      console.error('Error creating admin user:', error);
    }
  }

  await app.close();
}

bootstrap();
