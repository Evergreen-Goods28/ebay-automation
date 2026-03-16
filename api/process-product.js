// api/process-product.js
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { frontPhoto, backPhoto, topPhoto, notes } = req.body;

    console.log('Step 1: Identifying product with Gemini...');
    const productData = await identifyProduct(frontPhoto, backPhoto, topPhoto);

    console.log('Step 2: Generating eBay listing...');
    const listingData = await generateListing(productData);

    console.log('Step 3: Saving to database...');
    const { data: product, error: dbError } = await supabase
      .from('products')
      .insert([{
        brand: productData.brand,
        product_name: productData.product_name,
        variant: productData.variant,
        size: productData.size,
        product_type: productData.product_type,
        upc: productData.upc,
        confidence_score: productData.confidence_score,
        title: listingData.title,
        category_id: listingData.category_id,
        condition: listingData.condition,
        description: listingData.description,
        price: listingData.suggested_price,
        photo_front_url: frontPhoto,
        photo_back_url: backPhoto,
        photo_top_url: topPhoto,
        damage_notes: notes,
        status: 'ready'
      }])
      .select()
      .single();

    if (dbError) throw dbError;

    fetch(`${req.headers.origin}/api/scrape-images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, searchQuery: `${productData.brand} ${productData.product_name} ${productData.size}` })
    }).catch(err => console.error('Image scraping error:', err));

    return res.status(200).json({
      success: true,
      productId: product.id,
      message: 'Product processed successfully'
    });

  } catch (error) {
    console.error('Error processing product:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function identifyProduct(frontPhoto, backPhoto, topPhoto) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Analyze these product photos and extract ALL visible information.

EXTRACT EXACT TEXT from packaging. Read everything you can see.

Return ONLY valid JSON (no markdown, no backticks):
{
  "brand": "BRAND NAME",
  "product_name": "Full Product Name",
  "variant": "Shade/Scent/Type or null",
  "size": "Size with unit",
  "product_type": "Category (e.g., Body Lotion, Foundation, Toothbrush)",
  "upc": "Barcode number if visible or null",
  "confidence_score": 0-100
}`;

  const imageParts = [
    {
      inlineData: {
        data: frontPhoto.split(',')[1],
        mimeType: 'image/jpeg'
      }
    }
  ];

  if (backPhoto) {
    imageParts.push({
      inlineData: {
        data: backPhoto.split(',')[1],
        mimeType: 'image/jpeg'
      }
    });
  }

  const result = await model.generateContent([prompt, ...imageParts]);
  const response = await result.response;
  const text = response.text();
  
  let cleanText = text.trim();
  if (cleanText.startsWith('```')) {
    const lines = cleanText.split('\n');
    cleanText = lines.slice(1, -1).join('\n');
  }
  cleanText = cleanText.replace(/```json|```/g, '').trim();

  return JSON.parse(cleanText);
}

async function generateListing(productData) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Generate eBay listing fields for this product.

PRODUCT DATA:
${JSON.stringify(productData, null, 2)}

CATEGORY IDs:
- Foundation/Lipstick/Mascara: 31786
- Body Lotion/Skincare: 11504
- Shampoo/Conditioner: 11854
- Electric Toothbrush/Waterpik: 20767
- Men's Shaver: 31767
- Hair Styling Tools: 115958

TITLE FORMAT (max 80 chars): [BRAND] [PRODUCT] [VARIANT] [SIZE] New

Return ONLY valid JSON (no markdown):
{
  "title": "eBay title",
  "category_id": "eBay category ID",
  "condition": "New",
  "description": "Professional product description 2-3 sentences",
  "suggested_price": 0.00
}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  let cleanText = text.trim().replace(/```json|```/g, '').trim();
  return JSON.parse(cleanText);
}
