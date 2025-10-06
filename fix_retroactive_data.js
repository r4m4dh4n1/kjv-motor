const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Path ke database
const dbPath = path.join(__dirname, 'database.db');

// Fungsi untuk backup database
function backupDatabase() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(__dirname, `database_backup_${timestamp}.db`);
    
    try {
        fs.copyFileSync(dbPath, backupPath);
        console.log(`✅ Database backup created: ${backupPath}`);
        return backupPath;
    } catch (error) {
        console.error('❌ Error creating backup:', error);
        throw error;
    }
}

// Fungsi untuk menjalankan query
function runQuery(db, query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Fungsi untuk menjalankan update
function runUpdate(db, query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ changes: this.changes, lastID: this.lastID });
            }
        });
    });
}

async function fixRetroactiveData() {
    console.log('🔧 Memulai perbaikan data retroaktif...\n');
    
    // 1. Backup database
    const backupPath = backupDatabase();
    
    // 2. Buka koneksi database
    const db = new sqlite3.Database(dbPath);
    
    try {
        // 3. Cek data yang akan diupdate
        console.log('📊 Menganalisis data yang akan diperbaiki...');
        
        const checkOperationalQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN tanggal != original_month THEN 1 END) as need_update
            FROM operational 
            WHERE is_retroactive = true 
              AND kategori LIKE '%gaji%modal%'
              AND original_month IS NOT NULL
        `;
        
        const operationalCheck = await runQuery(db, checkOperationalQuery);
        console.log('Operational data:', operationalCheck[0]);
        
        const checkPembukuanQuery = `
            SELECT COUNT(*) as total
            FROM pembukuan 
            WHERE keterangan LIKE '%gaji%' 
              AND keterangan LIKE '%modal%'
        `;
        
        const pembukuanCheck = await runQuery(db, checkPembukuanQuery);
        console.log('Pembukuan data:', pembukuanCheck[0]);
        
        // 4. Tampilkan sample data sebelum update
        console.log('\n📋 Sample data sebelum update:');
        const sampleBeforeQuery = `
            SELECT 
                tanggal,
                original_month,
                kategori,
                deskripsi,
                nominal
            FROM operational 
            WHERE is_retroactive = true 
              AND kategori LIKE '%gaji%modal%'
              AND original_month IS NOT NULL
              AND tanggal != original_month
            LIMIT 5
        `;
        
        const sampleBefore = await runQuery(db, sampleBeforeQuery);
        console.table(sampleBefore);
        
        if (sampleBefore.length === 0) {
            console.log('✅ Tidak ada data yang perlu diperbaiki!');
            db.close();
            return;
        }
        
        // 5. Konfirmasi sebelum update
        console.log(`\n⚠️  Akan mengupdate ${operationalCheck[0].need_update} record di tabel operational`);
        console.log(`⚠️  Akan mengupdate record terkait di tabel pembukuan`);
        console.log(`📁 Backup tersimpan di: ${backupPath}`);
        
        // Untuk testing, kita akan menjalankan update
        console.log('\n🔄 Menjalankan update...');
        
        // 6. Update tabel operational
        const updateOperationalQuery = `
            UPDATE operational 
            SET tanggal = original_month
            WHERE is_retroactive = true 
              AND kategori LIKE '%gaji%modal%'
              AND original_month IS NOT NULL
              AND tanggal != original_month
        `;
        
        const operationalResult = await runUpdate(db, updateOperationalQuery);
        console.log(`✅ Updated ${operationalResult.changes} records in operational table`);
        
        // 7. Update tabel pembukuan - metode 1
        const updatePembukuanQuery1 = `
            UPDATE pembukuan 
            SET tanggal = (
                SELECT o.original_month 
                FROM operational o 
                WHERE o.is_retroactive = true 
                  AND o.kategori LIKE '%gaji%modal%'
                  AND o.company_id = pembukuan.company_id
                  AND o.nominal = pembukuan.debit
                  AND o.original_month IS NOT NULL
                ORDER BY o.created_at DESC
                LIMIT 1
            )
            WHERE keterangan LIKE '%gaji%'
              AND keterangan LIKE '%modal%'
              AND EXISTS (
                SELECT 1 FROM operational o 
                WHERE o.is_retroactive = true 
                  AND o.kategori LIKE '%gaji%modal%'
                  AND o.company_id = pembukuan.company_id
                  AND o.nominal = pembukuan.debit
                  AND o.original_month IS NOT NULL
              )
        `;
        
        const pembukuanResult = await runUpdate(db, updatePembukuanQuery1);
        console.log(`✅ Updated ${pembukuanResult.changes} records in pembukuan table`);
        
        // 8. Verifikasi hasil
        console.log('\n📊 Verifikasi hasil update:');
        
        const verifyQuery = `
            SELECT 
                'operational' as tabel,
                COUNT(*) as total_fixed
            FROM operational 
            WHERE is_retroactive = true 
              AND kategori LIKE '%gaji%modal%'
              AND tanggal = original_month
            
            UNION ALL
            
            SELECT 
                'pembukuan' as tabel,
                COUNT(*) as total_records
            FROM pembukuan 
            WHERE keterangan LIKE '%gaji%'
              AND keterangan LIKE '%modal%'
        `;
        
        const verifyResult = await runQuery(db, verifyQuery);
        console.table(verifyResult);
        
        // 9. Tampilkan sample data setelah update
        console.log('\n📋 Sample data setelah update:');
        const sampleAfterQuery = `
            SELECT 
                o.tanggal as tanggal_operational,
                o.original_month as bulan_target,
                o.kategori,
                o.deskripsi,
                o.nominal,
                p.tanggal as tanggal_pembukuan,
                p.keterangan
            FROM operational o
            LEFT JOIN pembukuan p ON (
                p.company_id = o.company_id 
                AND p.debit = o.nominal
                AND p.keterangan LIKE '%gaji%'
                AND p.keterangan LIKE '%modal%'
            )
            WHERE o.is_retroactive = true 
              AND o.kategori LIKE '%gaji%modal%'
            ORDER BY o.created_at DESC
            LIMIT 5
        `;
        
        const sampleAfter = await runQuery(db, sampleAfterQuery);
        console.table(sampleAfter);
        
        console.log('\n✅ Perbaikan data retroaktif selesai!');
        console.log('📁 Backup database tersimpan untuk keamanan');
        console.log('🔄 Silakan restart aplikasi untuk melihat perubahan');
        
    } catch (error) {
        console.error('❌ Error during update:', error);
        console.log(`📁 Database backup tersedia di: ${backupPath}`);
        throw error;
    } finally {
        db.close();
    }
}

// Jalankan script
if (require.main === module) {
    fixRetroactiveData().catch(console.error);
}

module.exports = { fixRetroactiveData };