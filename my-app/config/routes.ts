export default [
  {
    path: '/system',
    name: '系统管理',
    icon: 'setting',
    component: './System',
  },
  {
    path: '/order',
    name: '订单管理',
    icon: 'shopping',
    component: './Order',
  },
  {
    path: '/customer',
    name: '客服管理',
    icon: 'customerService',
    component: './Customer',
  },
  {
    path: '/content',
    name: '内容中心管理',
    icon: 'fileText',
    routes: [
      {
        path: '/content',
        redirect: '/content/product-list',
      },
      {
        path: '/content/product-list',
        name: '产品列表',
        component: './ContentCenter/ProductList',
      },
      {
        path: '/content/product-list/subject-manage',
        name: '科目管理',
        component: './ContentCenter/SubjectManage',
        hideInMenu: true,
      },
      {
        path: '/content/product-list/answer-manage',
        name: '答案管理',
        component: './ContentCenter/AnswerManage',
        hideInMenu: true,
      },
    ],
  },
  {
    path: '/statistics',
    name: '业务统计',
    icon: 'barChart',
    component: './Statistics',
  },
  {
    path: '/question-bank',
    name: '晋文源题库',
    icon: 'database',
    routes: [
      {
        path: '/question-bank',
        redirect: '/question-bank/task',
      },
      {
        path: '/question-bank/tag-system',
        redirect: '/tag-system/knowledge',
        hideInMenu: true,
      },
      {
        path: '/question-bank/tag-system/knowledge',
        redirect: '/tag-system/knowledge',
        hideInMenu: true,
      },
      {
        path: '/question-bank/tag-system/question-type',
        redirect: '/tag-system/question-type',
        hideInMenu: true,
      },
      {
        path: '/question-bank/tag-system/attributes',
        redirect: '/tag-system/attributes',
        hideInMenu: true,
      },
      {
        path: '/question-bank/task',
        name: '题库任务',
        component: './ContentCenter/QuestionBankTask',
      },
      {
        path: '/question-bank/word-upload',
        name: '试题上传',
        component: './PaperUpload',
      },
      {
        path: '/question-bank/tagging',
        name: '试题打标',
        icon: 'tags',
        redirect: '/question-bank/tagging-fullscreen',
      },
    ],
  },
  {
    path: '/tag-system',
    name: '标签设定',
    icon: 'tags',
    routes: [
      {
        path: '/tag-system',
        redirect: '/tag-system/knowledge',
      },
      {
        path: '/tag-system/knowledge',
        name: '知识体系',
        component: './ContentCenter/TagManage/Knowledge',
      },
      {
        path: '/tag-system/question-type',
        name: '题型管理',
        component: './ContentCenter/TagManage/QuestionType',
      },
      {
        path: '/tag-system/attributes',
        name: '属性设置',
        component: './ContentCenter/TagManage/Attributes',
      },
    ],
  },
  {
    path: '/',
    redirect: '/content/product-list',
  },
  {
    component: './404',
  },
  {
    path: '/question-bank/word-upload/edit',
    name: '在线校对',
    component: './PaperUpload/Edit',
    hideInMenu: true,
    layout: false,
  },
  {
    path: '/question-bank/tagging-fullscreen',
    name: '试题打标',
    component: './QuestionTagging',
    hideInMenu: true,
    layout: false,
  },
];
