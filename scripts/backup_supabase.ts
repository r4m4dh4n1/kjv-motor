import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

// Credentials read from environment variables or .env file
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables or .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TABLES = [
  "assets", "assets_combined", "assets_history", "biro_jasa", "biro_jasa_cicilan",
  "biro_jasa_history", "biro_jasa_payments", "brands", "cabang", "cicilan",
  "cicilan_duplicate", "cicilan_history", "companies", "employees", "fee_penjualan",
  "fee_penjualan_history", "jenis_motor", "modal_history", "monthly_adjustments",
  "monthly_closures", "ongkir_cicilan", "ongkir_payments", "operational",
  "operational_combined", "operational_history", "pembelian", "pembelian_combined",
  "pembelian_duplicate", "pembelian_history", "pembukuan", "pembukuan_combined",
  "pembukuan_history", "pencatatan_asset", "pencatatan_asset_history", "penjualans",
  "penjualans_backup", "penjualans_combined", "penjualans_history", "permissions",
  "price_histories", "price_histories_pembelian", "profiles", "profit_adjustments",
  "profit_distribution", "qc_history", "qc_report", "qc_report_history",
  "retroactive_operational", "role_permissions", "roles", "user_roles"
];

async function backupTable(tableName: string, backupDir: string) {
  console.log(`Backing up ${tableName}...`);
  let allData: any[] = [];
  let from = 0;
  let to = 999;
  let finished = false;

  while (!finished) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(from, to)
      .order('id', { ascending: true, nullsFirst: false }); // Best effort ordering

    if (error) {
      // Some views/tables might not have 'id' column, try without order
      if (error.message.includes('column "id" does not exist')) {
        const { data: dataNoOrder, error: errorNoOrder } = await supabase
          .from(tableName)
          .select('*')
          .range(from, to);
        
        if (errorNoOrder) {
          console.error(`Error backing up ${tableName}:`, errorNoOrder.message);
          return;
        }
        
        if (dataNoOrder) {
          allData = allData.concat(dataNoOrder);
          if (dataNoOrder.length < 1000) finished = true;
        }
      } else {
        console.error(`Error backing up ${tableName}:`, error.message);
        return;
      }
    } else if (data) {
      allData = allData.concat(data);
      if (data.length < 1000) finished = true;
    }

    from += 1000;
    to += 1000;
  }

  const filePath = join(backupDir, `${tableName}.json`);
  await writeFile(filePath, JSON.stringify(allData, null, 2));
  console.log(`Saved ${allData.length} rows to ${filePath}`);
}

async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = join(process.cwd(), 'backups', timestamp);

  try {
    await mkdir(backupDir, { recursive: true });
    console.log(`Created backup directory: ${backupDir}`);

    for (const table of TABLES) {
      await backupTable(table, backupDir);
    }

    console.log('\nBackup completed successfully!');
  } catch (error) {
    console.error('Backup failed:', error);
  }
}

runBackup();
