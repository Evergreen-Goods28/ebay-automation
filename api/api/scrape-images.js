// api/scrape-images.js
// Scrapes professional product images from Amazon and eBay

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

const supabase = createClient(
  'https://ypwmrcerqexqgnpgrfph.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwd21yY2VycWV4cWducGdyZnBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NzY1NzgsImV4cCI6MjA1MjU1MjU3OH0.4NTs3EDX9hVhVh69CN739A_Q2wPOcJXyH6P_example'
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { productId, searchQuery } = req.body;

    console.log(`Scraping images for: ${searchQuery}`);

    const images = [];

    // Scrape Amazon
    try {
      const amazonImages = await scrapeAmazon(searchQuery);
      images.push(...amazonImages);
    } catch (err) {
      console.error('Amazon scrape error:', err.message);
    }

    // Scrape eBay
    try {
      const ebayImages = await scrapeEbay(searchQuery);
      images.push(...ebayImages);
    } catch (err) {
      console.error('eBay scrape error:', err.message);
    }

    // Remove duplicates
    const uniqueImages = Array.from(new Set(images.map(img => img.url)))
      .map(url => images.find(img => img.url === url))
      .slice(0, 20); // Limit to 20 images

    // Save to database
    if (uniqueImages.length > 0) {
      const imagesToInsert = uniqueImages.map((img, index) => ({
        product_id: productId,
        image_url: img.url,
        source: img.source,
        image_type: img.type,
        quality_score: img.score,
        is_selected: index < 6, // Auto-select first 6
        selection_order: index < 6 ? index + 1 : null
      }));

      const { error: insertError } = await supabase
        .from('product_images')
        .insert(imagesToInsert);

      if (insertError) throw insertError;
    }

    return res.status(200).json({
      success: true,
      count: uniqueImages.length,
      message: `Scraped ${uniqueImages.length} images`
    });

  } catch (error) {
    console.error('Error scraping images:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function scrapeAmazon(query) {
  const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
  
  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const html = await response.text();
  const $ = cheerio.load(html);
  const images = [];

  // Find product images
  $('img[data-image-latency]').each((i, elem) => {
    const src = $(elem).attr('src');
    if (src && src.includes('amazon') && !src.includes('_AC_UL')) {
      // Get high-res version
      const highResSrc = src.replace(/\._.*?_/, '._AC_SL1500_');
      images.push({
        url: highResSrc,
        source: 'Amazon',
        type: i === 0 ? 'front' : 'detail',
        score: 95 - (i * 2)
      });
    }
  });

  return images.slice(0, 10);
}

async function scrapeEbay(query) {
  const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
  
  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const html = await response.text();
  const $ = cheerio.load(html);
  const images = [];

  // Find product images
  $('img.s-item__image-img').each((i, elem) => {
    const src = $(elem).attr('src');
    if (src && src.includes('ebayimg.com')) {
      images.push({
        url: src,
        source: 'eBay',
        type: i === 0 ? 'front' : 'detail',
        score: 90 - (i * 2)
      });
    }
  });

  return images.slice(0, 10);
}
