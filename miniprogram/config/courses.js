const builtinCourses = [
  {
    course_id: 'builtin-daily-basic',
    course_name: '日常口语基础',
    description: '适合碎片时间练习的常用问候和生活短句',
    difficulty: 'easy',
    category: '日常',
    sentence_count: 3,
    sentences: [
      {
        english: 'How are you today?',
        chinese: '你今天怎么样？',
        phonetic: '/haʊ ɑːr juː təˈdeɪ/'
      },
      {
        english: 'I would like a cup of tea.',
        chinese: '我想要一杯茶。',
        phonetic: '/aɪ wʊd laɪk ə kʌp əv tiː/'
      },
      {
        english: 'Could you help me, please?',
        chinese: '可以请你帮我一下吗？',
        phonetic: '/kʊd juː help miː pliːz/'
      }
    ]
  },
  {
    course_id: 'builtin-work-basic',
    course_name: '职场表达入门',
    description: '会议、沟通和任务协作中的高频表达',
    difficulty: 'medium',
    category: '商务',
    sentence_count: 3,
    sentences: [
      {
        english: 'Let us schedule a meeting for tomorrow.',
        chinese: '我们把会议安排在明天吧。',
        phonetic: '/let ʌs ˈskedʒuːl ə ˈmiːtɪŋ fɔːr təˈmɑːroʊ/'
      },
      {
        english: 'I will send you the report later.',
        chinese: '我稍后会把报告发给你。',
        phonetic: '/aɪ wɪl send juː ðə rɪˈpɔːrt ˈleɪtər/'
      },
      {
        english: 'We need to finish this task today.',
        chinese: '我们需要今天完成这个任务。',
        phonetic: '/wiː niːd tuː ˈfɪnɪʃ ðɪs tæsk təˈdeɪ/'
      }
    ]
  }
];

module.exports = {
  builtinCourses
};
