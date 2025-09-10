function toUTCFromWIB(date: Date): Date {
  return new Date(date.getTime() - (7 * 60 * 60 * 1000));
}

export function getDateRange(
  filter: string,
  customStartDate?: string,
  customEndDate?: string
): { start: Date; end: Date } {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  let start: Date;
  let end: Date;

  switch (filter) {
    case 'today':
      start = new Date(startOfToday);
      end = new Date(startOfToday);
      end.setHours(23, 59, 59, 999);
      break;

    case 'this_week': {
      const dayOfWeek = startOfToday.getDay();
      const diffToMonday = (dayOfWeek + 6) % 7;
      start = new Date(startOfToday);
      start.setDate(start.getDate() - diffToMonday);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }

    case 'this_month':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      break;

    // Tambahkan case yang hilang:
    case 'last_month': {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      start = new Date(lastMonth);
      end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
      break;
    }

    case 'this_year':
      start = new Date(today.getFullYear(), 0, 1); // 1 Januari tahun ini
      end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999); // 31 Desember tahun ini
      break;

    case 'last_year':
      start = new Date(today.getFullYear() - 1, 0, 1); // 1 Januari tahun lalu
      end = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999); // 31 Desember tahun lalu
      break;

    case 'custom': {
      if (customStartDate && customEndDate) {
        // Gunakan format timezone yang valid
        const startLocal = new Date(`${customStartDate}T00:00:00+07:00`);
        const endLocal = new Date(`${customEndDate}T23:59:59.999+07:00`);
        start = new Date(startLocal.getTime() - (7 * 60 * 60 * 1000));
        end = new Date(endLocal.getTime() - (7 * 60 * 60 * 1000));
      } else {
        start = new Date(startOfToday);
        end = new Date(startOfToday);
        end.setHours(23, 59, 59, 999);
      }
      break;
    }

    default:
      start = new Date(startOfToday);
      end = new Date(startOfToday);
      end.setHours(23, 59, 59, 999);
      break;
  }

  // Kecuali 'custom', semua tanggal tetap perlu dikonversi dari WIB ke UTC
  if (filter !== 'custom') {
    start = toUTCFromWIB(start);
    end = toUTCFromWIB(end);
  }

  return { start, end };
}