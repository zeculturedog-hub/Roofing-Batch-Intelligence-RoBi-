import {inventory} from '../data/mock-inventory.js';

const getXLSX = async () => {
  if (typeof window !== 'undefined') {
    return await import('/vendor/xlsx.mjs');
  }
  return await import('xlsx');
};

export class InventoryDataSource {
  async getInventory() { throw new Error('Not implemented'); }
}

export class MockDataSource extends InventoryDataSource {
  async getInventory() {
    return inventory.map(x => ({ ...x, source: 'Mock Dataset', lastUpdated: '2026-08-28T09:42:00' }));
  }
}

const requiredColumns = ['Company Code', 'Plant', 'Material', 'Batch', 'Quantity KGs'];
const normalized = (value) => value === undefined || value === null || value === '' ? null : String(value).trim();
const number = (value) => typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, '')) || 0;

/** Smart extraction of color & thickness from material descriptions when available */
function extractSpecs(description, materialCode) {
  const text = `${description || ''} ${materialCode || ''}`.toUpperCase();
  let color = null;
  let thickness = null;

  if (/RED|BRICK|TERRA/i.test(text)) color = 'Brick Red';
  else if (/CHARCOAL|DARK GREY|BLACK/i.test(text)) color = 'Charcoal';
  else if (/GREEN|FOREST/i.test(text)) color = 'Forest Green';
  else if (/BLUE|PACIFIC/i.test(text)) color = 'Pacific Blue';
  else if (/WHITE|OFF WHITE/i.test(text)) color = 'Off White';
  else if (/BARE|UNPAINTED|ZINCAL/i.test(text)) color = 'Bare / Aluzinc';

  const thickMatch = text.match(/(0\.[0-9]{2,3})\s*(MM)?/i);
  if (thickMatch) thickness = `${thickMatch[1]} mm`;

  return { color, thickness };
}

/** Normalizes the SAP BI inventory cross-tab with multi-sheet selection support */
export class FileDataSource extends InventoryDataSource {
  async inspectWorkbook(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(extension)) throw new Error('Upload a CSV, XLS, or XLSX inventory export.');
    const XLSX = await getXLSX();
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const availableSheets = workbook.SheetNames.filter(name => !name.startsWith('_'));
    const defaultSheet = availableSheets.find(name => /july/i.test(name)) || availableSheets.find(name => /june/i.test(name)) || availableSheets[0];
    return { workbook, availableSheets, defaultSheet };
  }

  async parse(file, sheetNameToUse = null) {
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(extension)) throw new Error('Upload a CSV, XLS, or XLSX inventory export.');
    const XLSX = await getXLSX();
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const availableSheets = workbook.SheetNames.filter(name => !name.startsWith('_'));
    
    const targetSheet = sheetNameToUse && workbook.Sheets[sheetNameToUse]
      ? sheetNameToUse
      : (availableSheets.find(name => /july/i.test(name)) || availableSheets.find(name => /june/i.test(name)) || availableSheets[0]);

    if (!workbook.Sheets[targetSheet]) throw new Error(`Sheet "${targetSheet}" was not found in the workbook.`);

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[targetSheet], { header: 1, defval: null, raw: true });
    const headerRow = rows.findIndex(row => row && row.includes('Company Code') && row.includes('Batch'));
    if (headerRow < 0) throw new Error(`The expected SAP BI header row (Company Code, Plant, Material, Batch) was not found in sheet "${targetSheet}".`);

    const headers = rows[headerRow].map((value, column) => normalized(rows[headerRow - 1]?.[column]) || normalized(value));
    const index = name => headers.indexOf(name);
    const missing = requiredColumns.filter(name => index(name) < 0);
    if (missing.length) throw new Error(`Missing required column(s): ${missing.join(', ')}.`);

    const i = {
      company: index('Company Code'),
      plant: index('Plant'),
      materialType: index('Material Type'),
      materialGroup: index('Material Group'),
      material: index('Material'),
      batch: index('Batch'),
      quantity: index('Quantity KGs'),
      age0: index('Quantity KG 00-30'),
      age31: index('Quantity KG 31-60'),
      age61: index('Quantity KG 61-90'),
      age91: index('Quantity KG 91-120'),
      age121: index('Quantity KG 121-180'),
      age181: index('Quantity KG 181-365'),
      age366: index('Quantity KG 366-730'),
      age731: index('Quantity KG 731-3YRS'),
      age3: index('Quantity KG > 3YRS')
    };

    const records = rows.slice(headerRow + 1)
      .filter(row => row && normalized(row[i.company]) && normalized(row[i.company]) !== 'Overall Result' && normalized(row[i.batch]) && normalized(row[i.batch]) !== '#')
      .map((row, rowIndex) => {
        const ageBuckets = [
          ['0–30 days', number(row[i.age0])],
          ['31–60 days', number(row[i.age31])],
          ['61–90 days', number(row[i.age61])],
          ['91–120 days', number(row[i.age91])],
          ['121–180 days', number(row[i.age121])],
          ['181–365 days', number(row[i.age181])],
          ['366–730 days', number(row[i.age366])],
          ['731 days–3 years', number(row[i.age731])],
          ['Over 3 years', number(row[i.age3])]
        ];

        const primaryAge = ageBuckets.slice().sort((a, b) => b[1] - a[1])[0];
        const material = normalized(row[i.material]);
        const description = normalized(row[i.material + 1]);
        const matTypeCode = normalized(row[i.materialType]);
        const matTypeDesc = normalized(row[i.materialType + 1]);
        const plantCode = normalized(row[i.plant]);
        const plantDesc = normalized(row[i.plant + 1]);
        
        const fullPlant = plantDesc ? `${plantCode} - ${plantDesc}` : plantCode;
        const fullMatType = matTypeDesc ? `${matTypeCode} - ${matTypeDesc}` : (matTypeCode || 'Coil Stock');
        const specs = extractSpecs(description, material);

        return {
          id: `sap-${rowIndex + 1}`,
          batchId: normalized(row[i.batch]),
          product: description || material || fullMatType,
          material: material || description,
          materialType: matTypeCode,
          materialTypeDesc: fullMatType,
          materialGroup: normalized(row[i.materialGroup]),
          color: specs.color,
          thickness: specs.thickness,
          finish: matTypeCode === 'ZPAZ' ? 'Prepainted' : 'Standard',
          coating: matTypeCode === 'ZPAZ' ? 'PPAZ' : matTypeCode === 'ZAZC' ? 'Al-Zinc' : 'None',
          length: 'Coil',
          plant: fullPlant,
          location: 'Coil Warehouse',
          quantity: number(row[i.quantity]),
          quantityUnit: 'KG',
          ageBucket: primaryAge && primaryAge[1] > 0 ? primaryAge[0] : '0–30 days',
          productionDate: null,
          companyCode: normalized(row[i.company]),
          ageBucketQuantities: Object.fromEntries(ageBuckets),
          source: `Uploaded SAP BI · ${targetSheet}`,
          lastUpdated: new Date().toISOString()
        };
      });

    if (!records.length) throw new Error(`No usable inventory records could be read from sheet "${targetSheet}".`);

    const totalWeightKG = records.reduce((s, r) => s + r.quantity, 0);

    return {
      records,
      sheetName: targetSheet,
      availableSheets,
      totalWeightKG,
      columns: headers.filter(Boolean),
      missingOptional: ['Laboratory Color ΔE', 'Exact Coil Heat Cert Date'],
      sourceName: `Uploaded SAP BI · ${file.name} [${targetSheet}]`
    };
  }
}

export class SapDataSource extends InventoryDataSource {
  async getInventory() { throw new Error('SAP adapter is a defined placeholder; no direct SAP connection is configured.'); }
}

