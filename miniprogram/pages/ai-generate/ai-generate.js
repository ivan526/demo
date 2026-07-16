const storage = require('../../utils/storage');

const difficulties = [
  { value: 'easy', label: '简单', desc: '短句、常用词' },
  { value: 'medium', label: '中等', desc: '中等长度、常用短语' },
  { value: 'hard', label: '困难', desc: '长句、复杂表达' }
];

const sentenceCounts = [5, 10, 15, 20];

Page({
  data: {
    topic: '',
    selectedDifficulty: 'easy',
    selectedCount: 10,
    difficulties,
    sentenceCounts,
    isGenerating: false,
    generatedSentences: null,
    generatedCourse: null,
    showPreview: false
  },

  onTopicInput(event) {
    this.setData({
      topic: event.detail.value
    });
  },

  selectDifficulty(event) {
    this.setData({
      selectedDifficulty: event.currentTarget.dataset.value
    });
  },

  selectCount(event) {
    this.setData({
      selectedCount: parseInt(event.currentTarget.dataset.value, 10)
    });
  },

  async generateCourse() {
    const { topic, selectedDifficulty: difficulty, selectedCount: count } = this.data;

    if (!topic.trim()) {
      wx.showToast({
        title: '请输入课程主题',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    this.setData({ isGenerating: true });

    try {
      const sentences = await this.mockAIGenerate(topic, difficulty, count);
      
      const course = {
        course_name: `${topic} - ${difficulties.find(d => d.value === difficulty).label}`,
        description: `AI 生成的"${topic}"主题英语练习课程，共${count}句`,
        difficulty,
        category: 'AI生成',
        source: 'ai',
        sentences
      };

      this.setData({
        generatedCourse: course,
        generatedSentences: sentences,
        showPreview: true,
        isGenerating: false
      });
    } catch (error) {
      this.setData({ isGenerating: false });
      wx.showToast({
        title: '生成失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
  },

  async mockAIGenerate(topic, difficulty, count) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const templates = {
          easy: [
            { en: 'I like {topic}.', cn: '我喜欢{topic}。', ph: '/aɪ laɪk {topic}/' },
            { en: 'This is {topic}.', cn: '这是{topic}。', ph: '/ðɪs ɪz {topic}/' },
            { en: 'Let us talk about {topic}.', cn: '让我们谈谈{topic}。', ph: '/let ʌs tɔːk əˈbaʊt {topic}/' },
            { en: '{topic} is interesting.', cn: '{topic}很有趣。', ph: '/{topic} ɪz ˈɪntrəstɪŋ/' },
            { en: 'I learn about {topic} every day.', cn: '我每天学习{topic}。', ph: '/aɪ lɜːn əˈbaʊt {topic} ˈevri deɪ/' },
            { en: 'What do you think of {topic}?', cn: '你觉得{topic}怎么样？', ph: '/wʌt duː juː θɪŋk ɒv {topic}/' },
            { en: 'I want to know more about {topic}.', cn: '我想了解更多关于{topic}的知识。', ph: '/aɪ wɒnt tuː nəʊ mɔːr əˈbaʊt {topic}/' },
            { en: '{topic} helps me a lot.', cn: '{topic}对我帮助很大。', ph: '/{topic} helps miː ə lɒt/' },
            { en: 'My friend also likes {topic}.', cn: '我的朋友也喜欢{topic}。', ph: '/maɪ frend ˈɔːlsəʊ laɪks {topic}/' },
            { en: 'We can learn {topic} together.', cn: '我们可以一起学习{topic}。', ph: '/wiː kæn lɜːn {topic} təˈɡeðər/' }
          ],
          medium: [
            { en: 'Learning {topic} has greatly improved my understanding of the subject.', cn: '学习{topic}极大地提高了我对这门学科的理解。', ph: '/ˈlɜːnɪŋ {topic} hæz ˈɡreɪtli ɪmˈpruːvd maɪ ˌʌndəˈstændɪŋ ɒv ðə ˈsʌbdʒɪkt/' },
            { en: 'Many people around the world are interested in {topic}.', cn: '世界上很多人都对{topic}感兴趣。', ph: '/ˈmeni ˈpiːpl əˈraʊnd ðə wɜːld ɑːr ˈɪntrəstɪd ɪn {topic}/' },
            { en: 'The importance of {topic} cannot be overstated.', cn: '{topic}的重要性怎么强调都不为过。', ph: '/ðə ɪmˈpɔːtns ɒv {topic} kænɒt bi ˈəʊvəsteɪtɪd/' },
            { en: 'I have been studying {topic} for several months now.', cn: '我已经学习{topic}好几个月了。', ph: '/aɪ hæv biːn ˈstʌdiɪŋ {topic} fɔːr ˈsevrəl mʌnθs naʊ/' },
            { en: 'There are many ways to approach learning {topic}.', cn: '学习{topic}有很多方法。', ph: '/ðeər ɑːr ˈmeni weɪz tuː əˈprəʊtʃ ˈlɜːnɪŋ {topic}/' },
            { en: '{topic} plays an important role in our daily lives.', cn: '{topic}在我们的日常生活中扮演着重要角色。', ph: '/{topic} pleɪz ən ɪmˈpɔːtnt rəʊl ɪn ˈaʊə ˈdeɪli lɪvz/' },
            { en: 'I would recommend {topic} to anyone who wants to learn.', cn: '我会向任何想学习的人推荐{topic}。', ph: '/aɪ wʊd ˌrekəˈmend {topic} tuː ˈeniwʌn huː wɒnts tuː lɜːn/' },
            { en: 'Understanding {topic} requires patience and practice.', cn: '理解{topic}需要耐心和练习。', ph: '/ˌʌndəˈstændɪŋ {topic} rɪˈkwaɪəz ˈpeɪʃns ənd ˈpræktɪs/' },
            { en: 'The more I learn about {topic}, the more interested I become.', cn: '我对{topic}了解得越多，就越感兴趣。', ph: '/ðə mɔːr aɪ lɜːn əˈbaʊt {topic}, ðə mɔːr ˈɪntrəstɪd aɪ bɪˈkʌm/' },
            { en: 'It is amazing how much {topic} has evolved over time.', cn: '{topic}随时间的演变令人惊叹。', ph: '/ɪts əˈmeɪzɪŋ haʊ mʌtʃ {topic} hæz iˈvɒlvd ˈəʊvə taɪm/' }
          ],
          hard: [
            { en: 'The profound implications of {topic} continue to reshape our fundamental understanding of the world around us.', cn: '{topic}的深远影响继续重塑我们对周围世界的基本理解。', ph: '/ðə prəˈfaʊnd ˌɪmplɪˈkeɪʃənz ɒv {topic} kənˈtɪnjuː tuː riːˈʃeɪp ˈaʊə ˌfʌndəˈmentl ˌʌndəˈstændɪŋ ɒv ðə wɜːld əˈraʊnd ʌs/' },
            { en: 'Experts in the field of {topic} have identified numerous groundbreaking developments that promise to revolutionize the industry.', cn: '{topic}领域的专家已经发现了许多有望彻底改变该行业的突破性发展。', ph: '/ˈekspɜːts ɪn ðə fiːld ɒv {topic} hæv aɪˈdentɪfaɪd ˈnjuːmərəs ˈɡraʊndbreɪkɪŋ dɪˈveləpmənts ðæt ˈprɒmɪs tuː ˌrevəˈluːʃənaɪz ði ˈɪndəstri/' },
            { en: 'A comprehensive analysis of {topic} reveals patterns and insights that would otherwise remain invisible to casual observers.', cn: '对{topic}的全面分析揭示了随意观察者看不见的模式和见解。', ph: '/ə ˌkɒmprɪˈhensɪv əˈnæləsɪs ɒv {topic} rɪˈviːlz ˈpætənz ənd ˈɪnsaɪts ðæt wʊd ˈʌðəwaɪz rɪˈmeɪn ɪnˈvɪzəbl tuː ˈkæʒuəl əbˈzɜːvəz/' },
            { en: 'The interdisciplinary nature of {topic} fosters innovation by bringing together diverse perspectives and methodologies.', cn: '{topic}的跨学科性质通过汇集不同的视角和方法来促进创新。', ph: '/ðə ˌɪntəˈdɪsəplɪnəri ˈneɪtʃə ɒv {topic} ˈfɒstəz ˌɪnəˈveɪʃn baɪ ˈbrɪŋɪŋ təˈɡeðə ˈdaɪvɜːs pəˈspektɪvz ənd ˌmeθəˈdɒlədʒiz/' },
            { en: 'Through rigorous research and systematic experimentation, we continue to unlock the mysteries and potential of {topic}.', cn: '通过严格的研究和系统的实验，我们继续解开{topic}的奥秘和潜力。', ph: '/θruː ˈrɪɡərəs rɪˈsɜːtʃ ənd ˌsɪstəˈmætɪk ɪkˌsperɪmenˈteɪʃən, wi kənˈtɪnjuː tuː ˈʌnlɒk ðə ˈmɪstəri z ənd pəˈtenʃl ɒv {topic}/' },
            { en: 'The transformative power of {topic} extends far beyond its immediate applications, influencing everything from culture to technology.', cn: '{topic}的变革力量远远超出其直接应用，影响从文化到技术的一切。', ph: '/ðə trænsˈfɔːmətɪv ˈpaʊər ɒv {topic} ɪkˈstendz fɑː bɪˈjɒnd ɪts ɪˈmiːdiət ˌæplɪˈkeɪʃənz, ˈɪnfluənsɪŋ ˈevriθɪŋ frɒm ˈkʌltʃə tuː tekˈnɒlədʒi/' },
            { en: 'Recent advancements in {topic} have opened new frontiers that were previously thought impossible or purely theoretical.', cn: '{topic}的最新进展开辟了以前认为不可能或纯粹是理论的新领域。', ph: '/ˈriːsnt ədˈvɑːnsmənts ɪn {topic} hæv ˈəʊpənd njuː ˈfrʌntɪəz ðæt wɜː ˈpriːviəsli θɔːt ɪmˈpɒsəbl ɔː ˈpjʊəli ˌθɪəˈretɪkl/' },
            { en: 'Understanding the nuanced complexities of {topic} requires both breadth of knowledge and depth of analysis.', cn: '理解{topic}的细微复杂性既需要知识广度，也需要分析深度。', ph: '/ˌʌndəˈstændɪŋ ðə ˈnjuːɑːnst kəmˈpleksətiz ɒv {topic} rɪˈkwaɪəz bəʊθ bredθ ɒv ˈnɒlɪdʒ ənd depθ ɒv əˈnæləsɪs/' },
            { en: 'The study of {topic} continues to challenge our assumptions and push the boundaries of what we consider possible.', cn: '对{topic}的研究继续挑战我们的假设，推动我们认为可能的边界。', ph: '/ðə ˈstʌdi ɒv {topic} kənˈtɪnjuːz tuː ˈtʃælɪndʒ ˈaʊər əˈsʌmpʃənz ənd pʊʃ ðə ˈbaʊndəriz ɒv wɒt wi kənˈsɪdə ˈpɒsəbl/' },
            { en: 'By examining {topic} from multiple perspectives, we gain insights that enrich both our theoretical understanding and practical applications.', cn: '通过从多个角度审视{topic}，我们获得的见解既丰富了我们的理论理解，也丰富了实际应用。', ph: '/baɪ ˈɪɡzæmɪnɪŋ {topic} frɒm ˈmʌltɪpl pəˈspektɪvz, wi ɡeɪn ˈɪnsaɪts ðæt ˈenrɪtʃ bəʊθ ˈaʊə ˌθɪəˈretɪkl ˌʌndəˈstændɪŋ ənd ˈpræktɪkl ˌæplɪˈkeɪʃənz/' }
          ]
        };

        const baseSentences = templates[difficulty] || templates.easy;
        const sentences = [];
        
        for (let i = 0; i < count; i++) {
          const template = baseSentences[i % baseSentences.length];
          const suffix = i >= baseSentences.length ? ` ${i + 1}` : '';
          
          sentences.push({
            english: template.en.replace(/{topic}/g, topic) + suffix,
            chinese: template.cn.replace(/{topic}/g, topic) + (suffix ? `（${i + 1}）` : ''),
            phonetic: template.ph.replace(/{topic}/g, topic.toLowerCase())
          });
        }

        resolve(sentences);
      }, 2000);
    });
  },

  saveCourse() {
    if (!this.data.generatedCourse) {
      return;
    }

    try {
      storage.saveCustomCourse(this.data.generatedCourse);
      wx.showToast({
        title: '课程保存成功！',
        icon: 'success',
        duration: 1500
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      wx.showToast({
        title: '保存失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  regenerate() {
    this.setData({
      showPreview: false,
      generatedSentences: null,
      generatedCourse: null
    });
  },

  closePreview() {
    this.setData({
      showPreview: false
    });
  }
});
