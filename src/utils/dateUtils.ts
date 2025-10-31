export function getDateRange(
  filter: string,
  customStartDate?: string,
  customEndDate?: string
): { start: Date; end: Date } {
  // ✅ PERBAIKAN: Gunakan waktu lokal sistem untuk perhitungan
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  let start: Date;
  let end: Date;

  switch (filter) {
    case "today":
      start = new Date(startOfToday);
      end = new Date(startOfToday);
      end.setHours(23, 59, 59, 999);
      break;

    case "this_week": {
      const dayOfWeek = startOfToday.getDay();
      const diffToMonday = (dayOfWeek + 6) % 7;
      start = new Date(startOfToday);
      start.setDate(start.getDate() - diffToMonday);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }

    case "this_month":
      // ✅ Gunakan bulan ini berdasarkan waktu lokal sistem
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );

      console.log("🗓️ This Month Range (WIB):", {
        start: start.toLocaleDateString("id-ID"),
        end: end.toLocaleDateString("id-ID"),
        currentMonth: today.getMonth() + 1,
        currentYear: today.getFullYear(),
      });
      break;

    case "last_month": {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      start = new Date(lastMonth);
      end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
      break;
    }

    case "this_year":
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;

    case "last_year":
      start = new Date(today.getFullYear() - 1, 0, 1);
      end = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      break;

    case "custom": {
      if (customStartDate && customEndDate) {
        // Untuk custom date, gunakan input langsung tanpa konversi timezone
        start = new Date(`${customStartDate}T00:00:00`);
        end = new Date(`${customEndDate}T23:59:59.999`);
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

  // Konversi ke UTC untuk query database
  const startUTC = new Date(start.getTime() - 7 * 60 * 60 * 1000);
  const endUTC = new Date(end.getTime() - 7 * 60 * 60 * 1000);

  console.log("🕐 Date Range Conversion:", {
    filter,
    localStart: start.toLocaleDateString("id-ID"),
    localEnd: end.toLocaleDateString("id-ID"),
    utcStart: startUTC.toISOString(),
    utcEnd: endUTC.toISOString(),
  });

  return { start: startUTC, end: endUTC };
}
