import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto, UpdateInvoiceDto, UpdateInvoiceStatusDto } from './dto/invoice.dto';
import { InvoiceStatus } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.invoice.findMany({
      include: { client: true, lineItems: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { client: true, lineItems: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async create(dto: CreateInvoiceDto) {
    const invoiceNumber = await this.generateInvoiceNumber(dto.invoiceDate);
    const totalAmount = dto.lineItems.reduce((sum, item) => sum + Number(item.amount), 0);

    return this.prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId: dto.clientId,
        invoiceDate: new Date(dto.invoiceDate),
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        workingDays: dto.workingDays,
        notes: dto.notes,
        totalAmount,
        lineItems: {
          create: dto.lineItems.map((item, idx) => ({
            description: item.description,
            company: item.company,
            quantity: item.quantity,
            periodMonth: item.periodMonth,
            amount: item.amount,
            sortOrder: item.sortOrder ?? idx,
          })),
        },
      },
      include: { client: true, lineItems: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    await this.findOne(id);
    const totalAmount = dto.lineItems.reduce((sum, item) => sum + Number(item.amount), 0);

    // Replace all line items
    await this.prisma.invoiceLineItem.deleteMany({ where: { invoiceId: id } });

    return this.prisma.invoice.update({
      where: { id },
      data: {
        clientId: dto.clientId,
        invoiceDate: new Date(dto.invoiceDate),
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        workingDays: dto.workingDays,
        notes: dto.notes,
        totalAmount,
        lineItems: {
          create: dto.lineItems.map((item, idx) => ({
            description: item.description,
            company: item.company,
            quantity: item.quantity,
            periodMonth: item.periodMonth,
            amount: item.amount,
            sortOrder: item.sortOrder ?? idx,
          })),
        },
      },
      include: { client: true, lineItems: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async updateStatus(id: string, dto: UpdateInvoiceStatusDto) {
    await this.findOne(id);
    return this.prisma.invoice.update({
      where: { id },
      data: { status: dto.status },
      include: { client: true, lineItems: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.invoice.delete({ where: { id } });
  }

  private async generateInvoiceNumber(invoiceDateStr: string): Promise<string> {
    const date = new Date(invoiceDateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = `ABI${year}${month}/`;

    // Count existing invoices for this month
    const count = await this.prisma.invoice.count({
      where: { invoiceNumber: { startsWith: prefix } },
    });

    return `${prefix}${count + 1}`;
  }
}
