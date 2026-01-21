-- Add dp_vendor and dp_vendor_date columns to biro_jasa table
ALTER TABLE biro_jasa
ADD COLUMN dp_vendor numeric DEFAULT 0,
ADD COLUMN dp_vendor_date date;

comment on column biro_jasa.dp_vendor is 'Jumlah DP yang dibayarkan ke biro jasa rekanan';
comment on column biro_jasa.dp_vendor_date is 'Tanggal pembayaran DP ke biro jasa rekanan';
