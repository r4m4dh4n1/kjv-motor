const fetchTotalModalCompanies = async (): Promise<number> => {
  try {
    console.log('🏢 Fetching total modal companies:', {
      selectedDivision,
      selectedCabang
    });

    let companiesQuery = supabase
      .from('companies')
      .select('modal, divisi, status')
      .eq('status', 'active');

    // Filter berdasarkan divisi jika dipilih
    if (selectedDivision && selectedDivision !== 'all') {
      companiesQuery = companiesQuery.eq('divisi', selectedDivision);
    }

    // Note: companies table doesn't have cabang_id column, so cabang filter is removed
    
    const { data: companiesResult, error: companiesError } = await companiesQuery;

    if (companiesError) {
      console.error('❌ Error fetching companies:', companiesError);
      throw companiesError;
    }

    const totalModal = companiesResult.reduce((sum, company) => sum + (company.modal || 0), 0);
    
    console.log('✅ Total modal companies calculated:', {
      companiesCount: companiesResult.length,
      totalModal
    });

    return totalModal;
  } catch (error) {
    console.error('❌ Error in fetchTotalModalCompanies:', error);
    return 0;
  }
};