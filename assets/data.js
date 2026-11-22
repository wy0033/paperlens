/* PaperLens 演示数据集
 * 注意：以下题录为「拟真样例」，用于离线原型演示，非知网真实题录。
 * 真实接入时只需替换 SearchProvider（见 engine.js / README.md），UI 与审查层无需改动。
 */
(function () {
  'use strict';

  // notes 顺序：来源核查 / 方法核查 / 数据核查 / 引用核查 / 结论核查
  function P(o) {
    return {
      lang: 'zh', downloads: 0, citations: 0, minutes: 12, score: 78,
      keywords: [], innovations: [], limits: [], terms: [], notes: [],
      url: '', abstractZh: '',
      // 借鉴 PubScholar 结果卡片：开放获取、原文来源渠道、卷期页
      oa: false, sourceChannel: '期刊官网', volumeIssue: '', platform: '演示数据集', kind: '期刊',
      sourceProvider: '演示数据集', sourceUrl: '', doi: '', retrievedAt: '', oaUrl: '', retractionStatus: 'unknown',
      method: { sample: '未披露', control: '未披露', stats: '未披露', dataset: '未披露' },
      ...o
    };
  }

  const papers = [
    P({
      id: 'P01',
      title: '面向非独立同分布数据的联邦学习个性化聚合方法研究',
      authors: ['陈亦航', '林知远', '周敏'], org: '浙江大学', year: 2023,
      venue: '博士学位论文', kind: '学位论文', level: '博士学位论文', languageLabel: '中文',
      downloads: 8420, citations: 187, field: '联邦学习', score: 88, minutes: 22,
      keywords: ['联邦学习', 'Non-IID', '个性化聚合', '差分隐私'],
      abstract: '针对联邦学习中客户端数据非独立同分布导致的全局模型收敛慢、本地性能退化问题，提出一种依据客户端数据分布相似度动态分配聚合权重的个性化聚合算法，并在三个公开基准上验证其收敛速度与精度。',
      method: { sample: '120 个模拟客户端，每轮随机抽取 20 个参与', control: '与 FedAvg、FedProx、SCAFFOLD 对比', stats: '配对 t 检验，报告 5 次独立重复的标准差', dataset: 'CIFAR-10 / FEMNIST / Shakespeare' },
      conclusion: '在强 Non-IID 划分下，所提方法较 FedAvg 平均提升 6.8% 分类准确率，通信轮次减少约 31%；但增益依赖客户端分布可估计这一前提。',
      innovations: ['用分布相似度替代样本量作为聚合权重依据', '把个性化层与全局层解耦，降低通信开销', '给出 Non-IID 程度与收敛速度的定量关系'],
      limits: ['仿真客户端，未覆盖真实跨机构网络延迟', '隐私预算未与聚合权重联合优化', '仅在图像与文本分类任务上验证'],
      terms: [
        { t: 'Non-IID', d: '各参与方的数据分布不一致，例如一家医院多为肺部影像、另一家多为脑部影像，导致统一模型难以兼顾。' },
        { t: '联邦聚合', d: '服务器把各方上传的模型参数按规则合并成全局模型，数据本身不出本地。' },
        { t: '收敛速度', d: '模型训练到稳定精度所需的通信轮数，联邦学习中轮数越多通信成本越高。' }
      ],
      notes: [
        '学位论文，浙江大学，可在校学位论文库检索到题录；未见撤稿或更正记录（需人工复核）。',
        '设置了 FedAvg / FedProx / SCAFFOLD 三组对照，报告重复实验与显著性检验，方法描述完整。',
        '正文图表与实验设置一致，公开数据集可复现；原始数据未随文提供。',
        '被引 187 次，主要被联邦优化类论文引用；暂未发现重复发表或证伪性引用。',
        '结论限定在「分布可估计」的仿真环境，未外推到真实跨机构部署，边界表述克制。'
      ]
    }),
    P({
      id: 'P02',
      title: '基于差分隐私的联邦学习通信开销优化',
      authors: ['沈书宁', '王骁'], org: '清华大学', year: 2024,
      venue: '硕士学位论文', kind: '学位论文', level: '硕士学位论文', languageLabel: '中文',
      downloads: 3610, citations: 62, field: '联邦学习', score: 79, minutes: 16,
      keywords: ['差分隐私', '梯度压缩', '通信开销', '隐私预算'],
      abstract: '在联邦学习梯度上传环节引入自适应裁剪与稀疏化，结合差分隐私预算分配策略，在给定隐私强度下降低上行通信量，并分析精度损失与隐私预算的权衡关系。',
      method: { sample: '50 个客户端，3 种隐私预算设置', control: '与未压缩 DP-FedAvg 对比', stats: '报告均值与方差，未做显著性检验', dataset: 'MNIST / CIFAR-10' },
      conclusion: '在 ε=3 时上行通信量下降约 44%，准确率损失 1.9 个百分点；预算更严格时精度下降明显加快。',
      innovations: ['把梯度稀疏化比例与隐私预算联动调整', '给出通信量-精度的帕累托前沿'],
      limits: ['未做显著性检验', '仅在两个图像数据集验证', '未考虑恶意客户端'],
      terms: [
        { t: '差分隐私', d: '给数据或梯度加入可控噪声，使外界难以反推单条记录；ε 越小隐私保护越强、可用性越低。' },
        { t: '梯度稀疏化', d: '只上传数值较大的一部分梯度，减少每轮传输的数据量。' },
        { t: '隐私预算 ε', d: '衡量隐私泄露上限的参数，数值越小越严格，需要跨轮次累计分配。' }
      ],
      notes: [
        '硕士学位论文，题录信息完整；未见撤稿记录（需人工复核）。',
        '设置了对照组，但未做统计显著性检验，结论强度受限。',
        '图表与正文描述一致，实验代码未公开，原始数据不可核验。',
        '被引 62 次，引用多为方法对比；未发现撤稿后仍被引用的情况。',
        '结论给出明确的 ε 条件与精度损失，未过度外推，但缺少统计支撑。'
      ]
    }),
    P({
      id: 'P03',
      title: 'FedBN+: Reducing Feature Shift in Federated Learning with Adaptive Normalization',
      authors: ['X. Li', 'M. Chen', 'R. Gupta'], org: 'Shanghai Jiao Tong University', year: 2022,
      venue: 'IEEE Transactions on Neural Networks and Learning Systems', kind: '期刊',
      level: 'SCI一区', lang: 'en', languageLabel: '英文',
      downloads: 12680, citations: 342, field: '联邦学习', score: 91, minutes: 20,
      keywords: ['federated learning', 'feature shift', 'batch normalization', 'domain adaptation'],
      abstract: 'We propose FedBN+, which keeps normalization statistics local to each client and adapts them with a lightweight gating module, mitigating feature shift under heterogeneous data distributions without extra communication rounds.',
      abstractZh: '本文提出 FedBN+：把归一化统计量保留在各客户端本地，并用一个轻量门控模块自适应调整，从而在不增加通信轮次的前提下缓解异构数据分布带来的特征偏移问题。',
      method: { sample: '4 个异构基准、共 100+ 客户端', control: 'FedAvg / FedBN / FedProx / SCAFFOLD', stats: '多次独立重复 + 置信区间', dataset: 'Digits / Office-Caltech / CIFAR-10' },
      conclusion: 'FedBN+ 在跨域场景下平均提升 5.2% 准确率，通信轮次与 FedBN 持平；门控模块带来的额外参数量小于 0.3%。',
      innovations: ['本地归一化统计量 + 可学习门控的自适应组合', '在不增加通信轮次的前提下处理特征偏移', '给出跨域场景下的理论偏差上界'],
      limits: ['理论分析假设客户端分布稳定', '未评估恶意客户端与投毒攻击', '门控超参数需按场景调整'],
      terms: [
        { t: 'Feature shift', d: '不同客户端数据分布差异导致同一特征含义漂移，全局模型难以对齐。' },
        { t: 'Batch Normalization', d: '对每批数据的中间特征做标准化，使训练更稳定；其统计量在联邦场景下是否共享是关键设计选择。' },
        { t: 'Gating module', d: '用一个小网络决定各分支信息按多少比例通过，参数量很小。' }
      ],
      notes: [
        '发表于 IEEE TNNLS，期刊、卷期与作者信息可核对；未在公开撤稿库中发现记录（需人工复核）。',
        '四组基线、多数据集、多次重复并报告置信区间，方法与统计设计完整。',
        '图表、正文与附录超参一致，使用公开数据集，代码仓库可访问。',
        '被引 342 次，包含后续改进与复现研究；暂未见被证伪或重复发表的公开指认。',
        '结论限定于特征偏移场景，并明确说明未覆盖攻击场景，证据与结论边界匹配。'
      ]
    }),
    P({
      id: 'P04',
      title: '隐私保护联邦学习在医疗影像中的可用性评估',
      authors: ['赵一诺', '何嘉树'], org: '浙江工业大学', year: 2025,
      venue: '硕士学位论文', kind: '学位论文', level: '硕士学位论文', languageLabel: '中文',
      downloads: 980, citations: 12, field: '联邦学习', score: 72, minutes: 14,
      keywords: ['医疗影像', '联邦学习', '可用性评估', '数据合规'],
      abstract: '以三家医院的胸部 X 光影像为场景，评估不同隐私预算下联邦模型的诊断性能与可用性，并讨论数据不出院的合规路径与落地障碍。',
      method: { sample: '3 家机构、约 2.1 万张影像', control: '集中式训练作为性能上界', stats: '报告 AUC 与 95% 置信区间', dataset: '内部脱敏影像集（不公开）' },
      conclusion: 'ε=8 时联邦模型 AUC 达到集中式上界的 96%，但跨机构标注差异带来的性能波动大于隐私噪声本身。',
      innovations: ['把合规约束纳入可用性评估框架', '量化标注规范差异对联邦性能的影响'],
      limits: ['数据不公开，外部无法复现', '仅单一病种', '未评估长期模型漂移'],
      terms: [
        { t: 'AUC', d: 'ROC 曲线下面积，衡量模型把正负样本排序正确的能力，越接近 1 越好。' },
        { t: '数据不出院', d: '原始数据保留在院内，仅交换模型参数，是医疗联邦学习常见的合规做法。' }
      ],
      notes: [
        '硕士学位论文，机构与年份明确；未见撤稿记录（需人工复核）。',
        '设置集中式上界作对照，报告置信区间，但未披露各机构样本量分布。',
        '正文与图表一致，但使用内部不公开数据集，原始数据与结果无法外部核验。',
        '发表较新、被引较少，引用网络尚不足以判断后续验证情况。',
        '结论区分了隐私噪声与标注差异的影响，未超出可支撑范围。'
      ]
    }),
    P({
      id: 'P05',
      title: '检索增强生成中的幻觉抑制与证据可追溯机制',
      authors: ['许清扬', '罗思远', '高文轩'], org: '北京大学', year: 2024,
      venue: '博士学位论文', kind: '学位论文', level: '博士学位论文', languageLabel: '中文',
      downloads: 11250, citations: 256, field: '大模型与RAG', score: 90, minutes: 24,
      keywords: ['检索增强生成', '幻觉', '证据溯源', '引用一致性'],
      abstract: '针对大模型在学术问答中生成无来源陈述的问题，提出「检索-断言-核验」三段式框架：把生成内容拆成可验证断言，逐条与检索到的原文片段对齐，并输出证据链与不确定标记。',
      method: { sample: '6 个学术问答数据集、1.2 万条断言', control: '与 RAG / Self-RAG / CRAG 对比', stats: '人工评测 + bootstrap 置信区间', dataset: '自建断言标注集 + 公开 QA 集' },
      conclusion: '断言级证据对齐使无来源陈述比例从 21.4% 降至 6.7%，但会牺牲约 12% 的回答覆盖率；两者存在明确权衡。',
      innovations: ['把生成结果拆成断言级可核验单元', '证据链可视化与不确定标记的联动', '给出覆盖率-忠实度的权衡曲线'],
      limits: ['依赖检索库质量', '人工评测成本较高', '对长篇推理链支持有限'],
      terms: [
        { t: 'RAG', d: '检索增强生成：先从外部资料库找出相关片段，再让模型基于这些片段作答，减少凭空编造。' },
        { t: '幻觉', d: '模型生成了看似合理但无依据或与来源矛盾的内容。' },
        { t: '证据链', d: '把回答中的每个结论关联到具体原文出处，方便读者逐条核对。' }
      ],
      notes: [
        '博士学位论文，题目、导师与学位授予单位可核对；未见撤稿记录（需人工复核）。',
        '三组基线、人工评测与置信区间齐备，断言级标注流程有详细说明。',
        '图表与正文一致，自建标注集有公开说明；部分原始数据因授权限制未公开。',
        '被引 256 次，含多篇后续复现与扩展研究；未发现公开证伪指认。',
        '明确报告覆盖率下降这一代价，结论未超出实验支撑边界。'
      ]
    }),
    P({
      id: 'P06',
      title: 'Hybrid Dense-Sparse Retrieval for Long-Form Question Answering',
      authors: ['A. Moreno', 'J. Kim', 'L. Fischer'], org: 'ETH Zürich', year: 2023,
      venue: 'ACM Transactions on Information Systems', kind: '期刊',
      level: 'SCI一区', lang: 'en', languageLabel: '英文',
      downloads: 9210, citations: 418, field: '大模型与RAG', score: 93, minutes: 21,
      keywords: ['dense retrieval', 'sparse retrieval', 'long-form QA', 'reranking'],
      abstract: 'We study how dense and sparse retrievers complement each other in long-form question answering, and introduce a fusion-then-rerank pipeline that improves evidence recall while keeping answer-level faithfulness measurable.',
      abstractZh: '本文研究稠密检索与稀疏检索在长文本问答中的互补性，提出「融合后重排」的流程：先合并两路召回结果再统一重排，在提升证据召回率的同时，让回答的忠实度仍可量化评估。',
      method: { sample: '3 个长文本 QA 基准、共 8.4 万问题', control: 'BM25 / DPR / ColBERT / 混合基线', stats: '配对 bootstrap 检验 + 人工忠实度评测', dataset: 'ELI5 / NarrativeQA / 自建集' },
      conclusion: '融合重排把证据召回率提升 9.3 个百分点，回答忠实度提升 4.1 个百分点；收益主要来自稀疏检索对稀有实体的覆盖。',
      innovations: ['按问题类型动态调整两路检索权重', '把证据召回与回答忠实度分开度量', '公开可复现的重排实现与评测脚本'],
      limits: ['英文语料为主', '重排阶段增加推理延迟', '对多跳问题的收益有限'],
      terms: [
        { t: 'Dense retrieval', d: '把文本编码成向量，用向量相似度找相关片段，擅长语义相近但用词不同的情况。' },
        { t: 'Sparse retrieval (BM25)', d: '按词频等统计特征匹配关键词，擅长命中人名、术语等稀有词。' },
        { t: 'Reranking', d: '对初筛结果用更强的模型重新排序，把最相关的片段放到前面。' }
      ],
      notes: [
        'ACM TOIS 期刊论文，DOI 与作者机构可核对；未在公开撤稿库中发现记录（需人工复核）。',
        '四组基线、大规模样本、配对检验与人工评测齐备，方法描述可复现。',
        '图表、正文与附录一致，公开评测脚本与数据划分说明完整。',
        '被引 418 次，被多篇综述与后续检索工作引用；暂未见重复发表指认。',
        '结论区分了召回率与忠实度，并说明多跳场景收益有限，边界清晰。'
      ]
    }),
    P({
      id: 'P07',
      title: '面向科研新手的文献问答系统设计与用户评估',
      authors: ['吴桐', '方以宁'], org: '浙江工业大学', year: 2025,
      venue: '北大核心', kind: '期刊', level: '北大核心', languageLabel: '中文',
      downloads: 1540, citations: 8, field: '教育技术', score: 76, minutes: 13,
      keywords: ['科研新手', '文献问答', '术语解释', '用户研究'],
      abstract: '面向低年级本科生设计文献问答系统，提供术语即时解释、分段摘要与阅读路径推荐，并通过 46 名被试的对照实验评估其对阅读理解与检索效率的影响。',
      method: { sample: '46 名本科生，随机分为两组', control: '传统检索+自行阅读组', stats: '独立样本 t 检验', dataset: '自建 30 篇文献阅读任务' },
      conclusion: '使用辅助系统的被试在术语理解题上得分提高 18%，文献筛选耗时下降约 27%，但未发现对深度评析能力的显著提升。',
      innovations: ['把术语解释嵌入原文阅读流程', '按先修知识生成个性化阅读顺序'],
      limits: ['样本量偏小且来自单一学校', '短期实验，未观察长期效果', '深度评析能力未提升'],
      terms: [
        { t: '对照组', d: '不接受新方案、按常规方式完成任务的一组，用来判断效果是否真由新系统带来。' },
        { t: '独立样本 t 检验', d: '比较两组平均值差异是否可能只是随机波动造成的常用统计方法。' }
      ],
      notes: [
        '北大核心期刊论文，期刊与年份可核对；未见撤稿记录（需人工复核）。',
        '设置随机对照与统计检验，但样本量 46 人且来自单一学校，代表性有限。',
        '图表与正文一致，实验材料与问卷未公开，原始数据不可核验。',
        '发表较新，被引 8 次，尚缺乏后续独立验证。',
        '明确报告「深度评析能力未提升」这一阴性结果，结论克制可信。'
      ]
    }),
    P({
      id: 'P08',
      title: '融合知识图谱的冷启动推荐方法研究',
      authors: ['唐逸凡', '郑南', '曹毓'], org: '华中科技大学', year: 2021,
      venue: '博士学位论文', kind: '学位论文', level: '博士学位论文', languageLabel: '中文',
      downloads: 6730, citations: 154, field: '推荐系统', score: 84, minutes: 19,
      keywords: ['冷启动', '知识图谱', '表示学习', '推荐系统'],
      abstract: '针对新用户与新物品交互稀疏问题，利用知识图谱中的实体关系补全用户偏好表示，并在两个真实业务数据集上验证离线与线上效果。',
      method: { sample: '2 个公开集 + 1 个业务集', control: '与 6 种主流冷启动方法对比', stats: '离线指标 + 线上 A/B 检验', dataset: 'MovieLens / Book-Crossing / 业务集' },
      conclusion: '新物品场景下 Recall@20 提升 11.6%，线上点击率提升 3.4%；知识图谱质量直接决定增益上限。',
      innovations: ['多跳关系路径的偏好传播', '离线与线上双维度验证', '给出图谱稀疏度与增益的关系'],
      limits: ['业务数据不可公开', '图谱构建成本高', '对全新领域迁移效果下降'],
      terms: [
        { t: '冷启动', d: '新用户或新物品几乎没有历史交互，常规基于行为的推荐方法难以生效。' },
        { t: '知识图谱', d: '用「实体—关系—实体」三元组组织的结构化知识，可补充行为数据之外的关联信息。' },
        { t: 'Recall@20', d: '推荐前 20 个结果中，命中用户真正感兴趣物品的比例。' }
      ],
      notes: [
        '博士学位论文，题录完整；未见撤稿记录（需人工复核）。',
        '六组基线、离线与线上 A/B 检验齐备，方法设计较充分。',
        '图表与正文一致，公开集可复现，业务集因保密未公开。',
        '被引 154 次，含工程复现类引用；未发现公开证伪指认。',
        '结论指出增益依赖图谱质量，未把业务集结果泛化到所有领域。'
      ]
    }),
    P({
      id: 'P09',
      title: '基于图神经网络的序列推荐偏差校正',
      authors: ['梁思成', '汪雨桐'], org: '北京邮电大学', year: 2024,
      venue: 'EI期刊', kind: '期刊', level: 'EI期刊', languageLabel: '中文',
      downloads: 2890, citations: 47, field: '推荐系统', score: 80, minutes: 15,
      keywords: ['序列推荐', '图神经网络', '曝光偏差', '因果推断'],
      abstract: '把用户行为序列建模为动态图，引入逆倾向加权校正曝光偏差，缓解热门物品被过度推荐的问题，并在三个公开数据集上比较长尾覆盖率。',
      method: { sample: '3 个公开数据集', control: '与 5 种序列推荐模型对比', stats: '报告多次重复均值，未做显著性检验', dataset: 'Amazon / Yelp / Tmall' },
      conclusion: '长尾物品曝光占比提升 8.9%，整体 NDCG 仅下降 0.6%，说明偏差校正代价较小。',
      innovations: ['动态图上的逆倾向加权', '把长尾覆盖率纳入主指标'],
      limits: ['逆倾向分数估计依赖假设', '未做显著性检验', '线上效果未验证'],
      terms: [
        { t: '曝光偏差', d: '用户只能看到系统展示的物品，没被展示的不代表不喜欢，模型会把「没点击」误学成「不感兴趣」。' },
        { t: '逆倾向加权', d: '给容易被展示的样本降权、给难被展示的样本升权，用来抵消上述偏差。' },
        { t: 'NDCG', d: '衡量推荐排序质量的指标，越靠前的位置命中相关物品得分越高。' }
      ],
      notes: [
        'EI 收录期刊，卷期与作者可核对；未见撤稿记录（需人工复核）。',
        '五组基线、公开数据集，但仅报告均值、未做显著性检验。',
        '正文与图表一致，公开数据集可复现，原始日志未额外提供。',
        '被引 47 次，引用集中在偏差校正方向；暂无公开重复失败报告。',
        '结论给出「覆盖率提升、NDCG 微降」的权衡，未超出实验支撑。'
      ]
    }),
    P({
      id: 'P10',
      title: '生成式 AI 辅助学术阅读对新手理解力的影响',
      authors: ['苏晚', '严子墨'], org: '华东师范大学', year: 2025,
      venue: 'CSSCI', kind: '期刊', level: 'CSSCI', languageLabel: '中文',
      downloads: 4320, citations: 33, field: '教育技术', score: 82, minutes: 14,
      keywords: ['生成式AI', '学术阅读', '理解力', '认知负荷'],
      abstract: '通过 128 名本科生的三组对照实验，比较「直接给摘要」「给摘要+术语解释」「给摘要+术语+引导提问」三种辅助方式对论文理解力与认知负荷的影响。',
      method: { sample: '128 名本科生，随机分三组', control: '无辅助组 + 两种辅助方式互相对照', stats: '方差分析 + 效应量', dataset: '自建阅读测验与认知负荷量表' },
      conclusion: '带引导提问的辅助方式在迁移理解题上显著优于直接给摘要，但也会让部分学生高估自己的掌握程度。',
      innovations: ['区分「看懂了」与「以为看懂了」的测量', '把引导提问作为独立变量'],
      limits: ['单篇学科材料', '即时测验，无延迟后测', '自我评估偏差机制未深挖'],
      terms: [
        { t: '认知负荷', d: '完成学习任务时占用的脑力资源，负荷过高会降低理解与记忆效果。' },
        { t: '迁移理解题', d: '不是复述原文，而是把所学用于新情境的题目，更能反映真实理解。' },
        { t: '效应量', d: '衡量差异「有多大」的指标，比只看是否显著更能说明实际价值。' }
      ],
      notes: [
        'CSSCI 期刊论文，来源可核对；未见撤稿记录（需人工复核）。',
        '三组随机对照、方差分析与效应量齐备，样本量 128 人较充分。',
        '图表与正文一致，量表与测验材料有附录说明，原始数据未公开。',
        '被引 33 次，含教育技术方向的重复验证讨论；暂无证伪指认。',
        '同时报告正向效果与「高估掌握程度」的风险，结论边界严谨。'
      ]
    }),
    P({
      id: 'P11',
      title: '学术术语自动解释工具在本科科研训练中的应用',
      authors: ['邱子涵', '施允'], org: '浙江工业大学', year: 2023,
      venue: '北大核心', kind: '期刊', level: '北大核心', languageLabel: '中文',
      downloads: 2150, citations: 25, field: '教育技术', score: 74, minutes: 12,
      keywords: ['术语解释', '科研训练', '可读性', '本科教学'],
      abstract: '构建面向本科生的学术术语自动解释模块，用通俗语言与类比替换专业表述，并在一门科研训练课程中评估其对文献阅读流畅度的影响。',
      method: { sample: '1 门课程、62 名学生', control: '前后测对照', stats: '配对 t 检验', dataset: '课程阅读书目 24 篇' },
      conclusion: '术语解释使单次阅读耗时下降 15%，阅读理解测验得分提高 9%，但对方法部分的帮助不明显。',
      innovations: ['面向新手的术语通俗化改写规则', '把解释粒度与阅读阶段关联'],
      limits: ['单课程样本', '无随机分组', '方法部分术语覆盖不足'],
      terms: [
        { t: '前后测', d: '同一批学生在使用工具前后各测一次，用来观察变化；缺少对照组时难以排除其他因素。' },
        { t: '可读性', d: '文本被读懂的难易程度，常用句长、术语密度等指标近似衡量。' }
      ],
      notes: [
        '北大核心期刊论文，题录可核对；未见撤稿记录（需人工复核）。',
        '仅有前后测、无随机对照组，统计检验存在混淆因素，方法强度偏弱。',
        '图表与正文一致，阅读书目列出，但原始作答数据未公开。',
        '被引 25 次，引用多为教学实践类文章；独立验证较少。',
        '结论承认「对方法部分帮助不明显」，未过度宣称效果。'
      ]
    }),
    P({
      id: 'P12',
      title: '基于深度学习的图像分类精度提升研究',
      authors: ['（作者信息不完整）'], org: '（未标注单位）', year: 2022,
      venue: '普通期刊', kind: '期刊', level: '普通期刊', languageLabel: '中文',
      downloads: 460, citations: 3, field: '计算机视觉', score: 46, minutes: 10,
      keywords: ['图像分类', '深度学习', '精度提升'],
      abstract: '通过改进网络结构提升图像分类准确率，实验表明所提方法优于传统方法，具有较好的应用前景。',
      method: { sample: '未披露样本量与划分方式', control: '仅与一种传统方法对比', stats: '未报告统计检验与重复实验', dataset: '未说明数据集来源' },
      conclusion: '所提方法显著提升了分类精度，可广泛应用于各类图像识别场景。',
      innovations: ['调整网络层数组合'],
      limits: ['实验信息不完整', '结论泛化范围过宽', '缺少可复现细节'],
      terms: [
        { t: '准确率', d: '预测正确的样本占比；类别不均衡时容易给出过于乐观的印象。' },
        { t: '基线方法', d: '用来对照的现有方法，基线太弱会让提升幅度看起来虚高。' }
      ],
      notes: [
        '期刊信息、作者单位与卷期著录不完整，无法确认同行评议情况；建议核验来源与撤稿记录。',
        '仅一组弱基线，未披露样本量、划分方式与统计检验，方法核查不通过。',
        '正文与图表缺少可比对细节，数据集来源与原始数据均未说明，结果无法核验。',
        '被引 3 次且缺少后续独立验证，引用网络不足以支撑结论可信度。',
        '「显著」「广泛应用」等表述明显超出单一未充分描述实验能支撑的边界，建议谨慎引用。'
      ]
    })
  ];

  // 拟真展示字段：让结果卡片具备 PubScholar 式的「原文来源 / OA / 卷期页」信息
  papers.forEach((p, i) => {
    if (p.lang === 'en') {
      p.oa = true; p.sourceChannel = 'DOAJ / 作者共享';
      p.volumeIssue = 'Vol.' + (20 + i) + ', pp.1–14';
    } else if (p.kind === '学位论文') {
      p.sourceChannel = '机构知识库'; p.volumeIssue = '学位论文';
    } else {
      p.sourceChannel = (i % 2) ? '维普' : '期刊官网';
      p.volumeIssue = p.year + ' 年第 ' + ((i % 6) + 1) + ' 期';
    }
  });

  const LEVELS = ['博士学位论文', '硕士学位论文', 'SCI一区', 'EI期刊', '北大核心', 'CSSCI', '普通期刊'];
  const FIELDS = ['联邦学习', '大模型与RAG', '推荐系统', '教育技术', '计算机视觉'];
  const SCHOOLS = Array.from(new Set(papers.map(p => p.org))).filter(s => !s.startsWith('（')).sort();

  window.PAPER_DATA = { papers, LEVELS, FIELDS, SCHOOLS };
})();
