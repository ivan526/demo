const builtinCourses = [
  {
    course_id: 'builtin-daily-basic',
    course_name: '日常口语基础',
    description: '适合碎片时间练习的常用问候和生活短句，轻松掌握日常生活中的基础表达',
    difficulty: 'easy',
    category: '日常',
    sentence_count: 10,
    sentences: [
      { english: 'How are you today?', chinese: '你今天怎么样？', phonetic: '/haʊ ɑːr juː təˈdeɪ/' },
      { english: 'I would like a cup of tea.', chinese: '我想要一杯茶。', phonetic: '/aɪ wʊd laɪk ə kʌp əv tiː/' },
      { english: 'Could you help me, please?', chinese: '可以请你帮我一下吗？', phonetic: '/kʊd juː help miː pliːz/' },
      { english: 'Nice to meet you.', chinese: '很高兴见到你。', phonetic: '/naɪs tuː miːt juː/' },
      { english: 'What time is it?', chinese: '现在几点了？', phonetic: '/wʌt taɪm ɪz ɪt/' },
      { english: 'It is a nice day.', chinese: '今天天气真好。', phonetic: '/ɪts ə naɪs deɪ/' },
      { english: 'Thank you very much.', chinese: '非常感谢你。', phonetic: '/θæŋk juː ˈveri mʌtʃ/' },
      { english: 'You are welcome.', chinese: '不客气。', phonetic: '/juː ɑːr ˈwelkəm/' },
      { english: 'Excuse me, where is the restroom?', chinese: '打扰一下，洗手间在哪里？', phonetic: '/ɪkˈskjuːz miː weər ɪz ðə ˈrestruːm/' },
      { english: 'See you tomorrow.', chinese: '明天见。', phonetic: '/siː juː təˈmɑːroʊ/' }
    ]
  },
  {
    course_id: 'builtin-work-basic',
    course_name: '职场表达入门',
    description: '会议、沟通和任务协作中的高频表达，提升职场沟通效率',
    difficulty: 'medium',
    category: '商务',
    sentence_count: 10,
    sentences: [
      { english: 'Let us schedule a meeting for tomorrow.', chinese: '我们把会议安排在明天吧。', phonetic: '/let ʌs ˈskedʒuːl ə ˈmiːtɪŋ fɔːr təˈmɑːroʊ/' },
      { english: 'I will send you the report later.', chinese: '我稍后会把报告发给你。', phonetic: '/aɪ wɪl send juː ðə rɪˈpɔːrt ˈleɪtər/' },
      { english: 'We need to finish this task today.', chinese: '我们需要今天完成这个任务。', phonetic: '/wiː niːd tuː ˈfɪnɪʃ ðɪs tæsk təˈdeɪ/' },
      { english: 'Please let me know if you have any questions.', chinese: '如果有任何问题，请告诉我。', phonetic: '/pliːz let miː noʊ ɪf juː hæv ˈeni ˈkwestʃənz/' },
      { english: 'I agree with your suggestion.', chinese: '我同意你的建议。', phonetic: '/aɪ əˈgriː wɪð jɔːr səˈdʒestʃən/' },
      { english: 'Can we discuss this further?', chinese: '我们可以进一步讨论一下吗？', phonetic: '/kæn wiː dɪˈskʌs ðɪs ˈfɜːrðər/' },
      { english: 'The deadline is next Friday.', chinese: '截止日期是下周五。', phonetic: '/ðə ˈdedlaɪn ɪz nekst ˈfraɪdeɪ/' },
      { english: 'I will be out of office next week.', chinese: '我下周不在办公室。', phonetic: '/aɪ wɪl bi aʊt ɒv ˈɒfɪs nekst wiːk/' },
      { english: 'Please review the document.', chinese: '请审阅这份文件。', phonetic: '/pliːz rɪˈvjuː ðə ˈdɒkjumənt/' },
      { english: 'Good job on the project.', chinese: '这个项目做得很好。', phonetic: '/ɡʊd dʒɒb ɒn ðə ˈprɒdʒekt/' }
    ]
  },
  {
    course_id: 'builtin-travel-basic',
    course_name: '旅行英语必备',
    description: '出国旅行必备句型，涵盖机场、酒店、餐厅等场景',
    difficulty: 'easy',
    category: '旅行',
    sentence_count: 10,
    sentences: [
      { english: 'Where is the boarding gate?', chinese: '登机口在哪里？', phonetic: '/weər ɪz ðə ˈbɔːdɪŋ ɡeɪt/' },
      { english: 'I would like to check in.', chinese: '我想办理入住。', phonetic: '/aɪ wʊd laɪk tuː tʃek ɪn/' },
      { english: 'Do you have a room available?', chinese: '请问有空房吗？', phonetic: '/duː juː hæv ə ruːm əˈveɪləbl/' },
      { english: 'How much is this?', chinese: '这个多少钱？', phonetic: '/haʊ mʌtʃ ɪz ðɪs/' },
      { english: 'Could I have the bill, please?', chinese: '请给我账单好吗？', phonetic: '/kʊd aɪ hæv ðə bɪl pliːz/' },
      { english: 'Take me to this address, please.', chinese: '请带我去这个地址。', phonetic: '/teɪk miː tuː ðɪs əˈdres pliːz/' },
      { english: 'Do you accept credit cards?', chinese: '你们接受信用卡吗？', phonetic: '/duː juː əkˈsept ˈkredɪt kɑːrdz/' },
      { english: 'I need a taxi to the airport.', chinese: '我需要一辆去机场的出租车。', phonetic: '/aɪ niːd ə ˈtæksi tuː ði ˈeəpɔːt/' },
      { english: 'Is breakfast included?', chinese: '早餐包含在内吗？', phonetic: '/ɪz ˈbrekfəst ɪnˈkluːdɪd/' },
      { english: 'Could you speak more slowly?', chinese: '你能说慢一点吗？', phonetic: '/kʊd juː spiːk mɔːr ˈsləʊli/' }
    ]
  },
  {
    course_id: 'builtin-shopping-basic',
    course_name: '购物英语会话',
    description: '购物、砍价、退换货等常用英语表达，轻松应对各种购物场景',
    difficulty: 'easy',
    category: '购物',
    sentence_count: 10,
    sentences: [
      { english: 'How much does this cost?', chinese: '这个多少钱？', phonetic: '/haʊ mʌtʃ dʌz ðɪs kɒst/' },
      { english: 'Can I try this on?', chinese: '我可以试穿吗？', phonetic: '/kæn aɪ traɪ ðɪs ɒn/' },
      { english: 'Do you have this in a larger size?', chinese: '这个有大一号的吗？', phonetic: '/duː juː hæv ðɪs ɪn ə ˈlɑːrdʒər saɪz/' },
      { english: 'Where are the fitting rooms?', chinese: '试衣间在哪里？', phonetic: '/weər ɑːr ðə ˈfɪtɪŋ ruːmz/' },
      { english: 'I will take it.', chinese: '我要买这个。', phonetic: '/aɪ wɪl teɪk ɪt/' },
      { english: 'Can you give me a discount?', chinese: '能给我打个折吗？', phonetic: '/kæn juː ɡɪv miː ə ˈdɪskaʊnt/' },
      { english: 'This is too expensive.', chinese: '这个太贵了。', phonetic: '/ðɪs ɪz tuː ɪkˈspensɪv/' },
      { english: 'Do you have this in another color?', chinese: '这个有别的颜色吗？', phonetic: '/duː juː hæv ðɪs ɪn əˈnʌðər ˈkʌlər/' },
      { english: 'I would like to return this.', chinese: '我想退货。', phonetic: '/aɪ wʊd laɪk tuː rɪˈtɜːn ðɪs/' },
      { english: 'Where can I pay?', chinese: '我在哪里付款？', phonetic: '/weər kæn aɪ peɪ/' }
    ]
  },
  {
    course_id: 'builtin-dining-basic',
    course_name: '餐厅点餐英语',
    description: '餐厅点餐、询问菜品、表达口味偏好的常用表达',
    difficulty: 'easy',
    category: '餐饮',
    sentence_count: 10,
    sentences: [
      { english: 'May I see the menu, please?', chinese: '可以给我看一下菜单吗？', phonetic: '/meɪ aɪ siː ðə ˈmenjuː pliːz/' },
      { english: 'What do you recommend?', chinese: '你推荐什么？', phonetic: '/wʌt duː juː ˌrekəˈmend/' },
      { english: 'I am a vegetarian.', chinese: '我是素食者。', phonetic: '/aɪ æm ə ˌvedʒəˈteəriən/' },
      { english: 'I do not eat spicy food.', chinese: '我不吃辣。', phonetic: '/aɪ duː nɒt iːt ˈspaɪsi fuːd/' },
      { english: 'This is delicious!', chinese: '这个很好吃！', phonetic: '/ðɪs ɪz dɪˈlɪʃəs/' },
      { english: 'Could I have some more water?', chinese: '可以再给我一些水吗？', phonetic: '/kʊd aɪ hæv sʌm mɔːr ˈwɔːtər/' },
      { english: 'The food is excellent.', chinese: '这里的食物很棒。', phonetic: '/ðə fuːd ɪz ˈeksələnt/' },
      { english: 'Check, please.', chinese: '请结账。', phonetic: '/tʃek pliːz/' },
      { english: 'Do you have reservations?', chinese: '你有预订吗？', phonetic: '/duː juː hæv ˌrezəˈveɪʃənz/' },
      { english: 'Enjoy your meal!', chinese: '祝你用餐愉快！', phonetic: '/ɪnˈdʒɔɪ jɔːr miːl/' }
    ]
  },
  {
    course_id: 'builtin-interview-basic',
    course_name: '面试英语必备',
    description: '自我介绍、回答问题、表达优势的面试常用表达',
    difficulty: 'medium',
    category: '求职',
    sentence_count: 10,
    sentences: [
      { english: 'Tell me about yourself.', chinese: '介绍一下你自己。', phonetic: '/tel miː əˈbaʊt jɔːrˈself/' },
      { english: 'What are your strengths?', chinese: '你的优势是什么？', phonetic: '/wʌt ɑːr jɔːr streŋθs/' },
      { english: 'Why do you want this job?', chinese: '你为什么想要这份工作？', phonetic: '/waɪ duː juː wɒnt ðɪs dʒɒb/' },
      { english: 'I have five years of experience.', chinese: '我有五年的工作经验。', phonetic: '/aɪ hæv faɪv jɪəz əv ɪkˈspɪəriəns/' },
      { english: 'I am a team player.', chinese: '我是一个有团队精神的人。', phonetic: '/aɪ æm ə tiːm ˈpleɪər/' },
      { english: 'I work well under pressure.', chinese: '我能在压力下很好地工作。', phonetic: '/aɪ wɜːrk wel ˈʌndər ˈpreʃər/' },
      { english: 'Where do you see yourself in five years?', chinese: '五年后你想达到什么位置？', phonetic: '/weər duː juː siː jɔːrˈself ɪn faɪv jɪəz/' },
      { english: 'Thank you for this opportunity.', chinese: '感谢你给我这个机会。', phonetic: '/θæŋk juː fɔːr ðɪs ˌɒpəˈtjuːnəti/' },
      { english: 'I look forward to hearing from you.', chinese: '我期待收到你的回复。', phonetic: '/aɪ lʊk ˈfɔːrwərd tuː ˈhɪərɪŋ frɒm juː/' },
      { english: 'What is your greatest achievement?', chinese: '你最大的成就是什么？', phonetic: '/wʌt ɪz jɔːr ˈgreɪtɪst əˈtʃiːvmənt/' }
    ]
  },
  {
    course_id: 'builtin-college-basic',
    course_name: '校园生活英语',
    description: '大学校园里的常用对话，课堂提问、小组讨论等场景',
    difficulty: 'easy',
    category: '校园',
    sentence_count: 10,
    sentences: [
      { english: 'What time does the class start?', chinese: '课程几点开始？', phonetic: '/wʌt taɪm dʌz ðə klɑːs stɑːrt/' },
      { english: 'Where is the library?', chinese: '图书馆在哪里？', phonetic: '/weər ɪz ðə ˈlaɪbrəri/' },
      { english: 'I need to borrow a book.', chinese: '我需要借一本书。', phonetic: '/aɪ niːd tuː ˈbɒrəʊ ə bʊk/' },
      { english: 'When is the assignment due?', chinese: '作业什么时候交？', phonetic: '/wen ɪz ðə əˈsaɪnmənt djuː/' },
      { english: 'Can you explain this again?', chinese: '你能再解释一遍吗？', phonetic: '/kæn juː ɪkˈspleɪn ðɪs əˈɡen/' },
      { english: 'I did not understand the lecture.', chinese: '我没听懂这个讲座。', phonetic: '/aɪ dɪd nɒt ˌʌndəˈstænd ðə ˈlektʃər/' },
      { english: 'Let us work together on this project.', chinese: '我们一起做这个项目吧。', phonetic: '/let ʌs wɜːk təˈɡeðər ɒn ðɪs ˈprɒdʒekt/' },
      { english: 'What is the homework for today?', chinese: '今天的家庭作业是什么？', phonetic: '/wʌt ɪz ðə ˈhəʊmwɜːk fɔːr təˈdeɪ/' },
      { english: 'I will study in the library this afternoon.', chinese: '今天下午我要去图书馆学习。', phonetic: '/aɪ wɪl ˈstʌdi ɪn ðə ˈlaɪbrəri ðɪs ˌɑːftəˈnuːn/' },
      { english: 'See you in class tomorrow.', chinese: '明天课堂上见。', phonetic: '/siː juː ɪn klɑːs təˈmɑːroʊ/' }
    ]
  },
  {
    course_id: 'builtin-health-basic',
    course_name: '健康与就医英语',
    description: '看医生、描述症状、药店买药的实用英语表达',
    difficulty: 'medium',
    category: '健康',
    sentence_count: 10,
    sentences: [
      { english: 'I have a headache.', chinese: '我头疼。', phonetic: '/aɪ hæv ə ˈhedeɪk/' },
      { english: 'I feel sick.', chinese: '我感觉不舒服。', phonetic: '/aɪ fiːl sɪk/' },
      { english: 'I have a fever.', chinese: '我发烧了。', phonetic: '/aɪ hæv ə ˈfiːvər/' },
      { english: 'My stomach hurts.', chinese: '我胃疼。', phonetic: '/maɪ ˈstʌmək hɜːts/' },
      { english: 'I cannot sleep well.', chinese: '我睡不好。', phonetic: '/aɪ kænɒt sliːp wel/' },
      { english: 'How often should I take this medicine?', chinese: '这个药我应该多久吃一次？', phonetic: '/haʊ ˈɒfn ʃʊd aɪ teɪk ðɪs ˈmedsn/' },
      { english: 'I need a prescription.', chinese: '我需要一张处方。', phonetic: '/aɪ niːd ə prɪˈskrɪpʃən/' },
      { english: 'Where is the nearest hospital?', chinese: '最近的医院在哪里？', phonetic: '/weər ɪz ðə ˈnɪərɪst ˈhɒspɪtl/' },
      { english: 'I have a cough.', chinese: '我咳嗽。', phonetic: '/aɪ hæv ə kɒf/' },
      { english: 'Get well soon!', chinese: '早日康复！', phonetic: '/ɡet wel suːn/' }
    ]
  },
  {
    course_id: 'builtin-family-basic',
    course_name: '家庭与亲情英语',
    description: '描述家庭成员、家庭活动、日常对话的实用表达',
    difficulty: 'easy',
    category: '家庭',
    sentence_count: 10,
    sentences: [
      { english: 'How is your family?', chinese: '你的家人怎么样？', phonetic: '/haʊ ɪz jɔːr ˈfæməli/' },
      { english: 'I love my parents.', chinese: '我爱我的父母。', phonetic: '/aɪ lʌv maɪ ˈpeərənts/' },
      { english: 'Do you have any brothers or sisters?', chinese: '你有兄弟姐妹吗？', phonetic: '/duː juː hæv ˈeni ˈbrʌðəz ɔːr ˈsɪstəz/' },
      { english: 'We are having dinner together.', chinese: '我们正在一起吃晚饭。', phonetic: '/wiː ɑːr ˈhævɪŋ ˈdɪnər təˈɡeðər/' },
      { english: 'My parents are visiting this weekend.', chinese: '我父母这个周末要来。', phonetic: '/maɪ ˈpeərənts ɑːr ˈvɪzɪtɪŋ ðɪs ˈwiːkend/' },
      { english: 'Let us have a family gathering.', chinese: '我们来一次家庭聚会吧。', phonetic: '/let ʌs hæv ə ˈfæməli ˈɡæðərɪŋ/' },
      { english: 'I miss my family.', chinese: '我想念我的家人。', phonetic: '/aɪ mɪs maɪ ˈfæməli/' },
      { english: 'Call me when you get home.', chinese: '到家后给我打电话。', phonetic: '/kɔːl miː wen juː ɡet həʊm/' },
      { english: 'How old are your children?', chinese: '你的孩子多大了？', phonetic: '/haʊ əʊld ɑːr jɔːr ˈtʃɪldrən/' },
      { english: 'Happy birthday!', chinese: '生日快乐！', phonetic: '/ˈhæpi ˈbɜːθdeɪ/' }
    ]
  }
];

module.exports = {
  builtinCourses
};
