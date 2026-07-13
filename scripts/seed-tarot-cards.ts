import { TAROT_CARDS } from '../lib/tarot-data';
import { getSupabaseAdmin } from '../lib/supabase';

async function main() {
  const admin = getSupabaseAdmin();

  const rows = TAROT_CARDS.map((card) => ({
    name: card.name,
    kor_name: card.korName,
    arcana: card.arcana,
    suit: card.suit ?? null,
    number: card.number ?? null,
    normal_meaning: card.normalMeaning,
    reverse_meaning: card.reverseMeaning,
    keywords: card.keywords,
    kor_normal_meaning: card.korNormalMeaning,
    kor_reverse_meaning: card.korReverseMeaning,
    kor_keywords: card.korKeywords,
    image_url: card.imageUrl ?? null,
  }));

  const { data, error } = await admin
    .from('tarot_cards')
    .upsert(rows, { onConflict: 'name' })
    .select('id, name');

  if (error) {
    console.error('시드 실패:', error.message);
    process.exit(1);
  }

  console.log(`시드 완료: ${data?.length ?? 0}/${TAROT_CARDS.length}장 upsert 됨`);
}

main().catch((err) => {
  console.error('시드 스크립트 실행 중 오류:', err instanceof Error ? err.message : err);
  process.exit(1);
});
