export default [
    {
        path: '/welcome',
        name: 'welcome',
        icon: 'smile',
        component: './Welcome',
    },
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
                redirect: '/question-bank/tag-system',
            },
            {
                path: '/question-bank/tag-system',
                name: '标签体系',
                component: './ContentCenter/TagManage',
            },
            {
                path: '/question-bank/task',
                name: '题库任务',
                component: './ContentCenter/QuestionBankTask',
            },

        ],
    },
    {
        path: '/',
        redirect: '/welcome',
    },
    {
        component: './404',
    },
];
