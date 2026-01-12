import { addPaper, parsePaper } from '@/services/questionEntry';
import {
    ProForm,
    ProFormDependency,
    ProFormDigit,
    ProFormRadio,
    ProFormSelect,
    ProFormText,
    StepsForm,
} from '@ant-design/pro-components';
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Card, Divider, message, Modal, Space, Upload } from 'antd';
import SingleEntry from '../Single';
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import React, { useState } from 'react';

const PaperEntry: React.FC = () => {
    const [previewVisible, setPreviewVisible] = useState(false);
    const [addQuestionVisible, setAddQuestionVisible] = useState(false);
    const [paperData, setPaperData] = useState<any>();

    const handleFinish = async (values: any) => {
        try {
            // If Question Entry mode, we don't create a paper. Questions are already added via SingleEntry.
            if (paperData?.entryMode === 'question') {
                message.success('散题录入完成');
                history.push('/question-bank/list');
                return true;
            }

            // Paper Entry mode
            const paperPayload = {
                ...values,
                sections: paperData?.sections || []
            };

            await addPaper(paperPayload);
            message.success('试卷录入成功');
            history.push('/question-bank/list');
            return true;
        } catch (error) {
            message.error('录入失败');
            return false;
        }
    };

    const handleOCRUpload = async (file: File) => {
        message.loading('正在进行OCR智能识别...', 0);
        try {
            const res = await parsePaper(file);
            message.destroy();
            if (res.success) {
                message.success('识别成功，已自动填充试卷结构');
                setPaperData(res.data);
                // Auto-fill form fields
                return res.data;
            }
        } catch (error) {
            message.destroy();
            message.error('识别失败');
        }
        return undefined;
    };

    return (
        <PageContainer title="整卷录入">
            <Card>
                <StepsForm
                    onFinish={handleFinish}
                    submitter={{
                        render: (props, dom) => {
                            if (props.step === 1) {
                                return [
                                    <Button key="preview" onClick={() => setPreviewVisible(true)}>
                                        整卷预览
                                    </Button>,
                                    ...dom,
                                ];
                            }
                            return dom;
                        },
                    }}
                >
                    <StepsForm.StepForm
                        name="base"
                        title="基本信息"
                        onFinish={async (values) => {
                            setPaperData({ ...paperData, ...values });
                            return true;
                        }}
                    >
                        <ProFormRadio.Group
                            name="entryMode"
                            label="录入模式"
                            initialValue="paper"
                            options={[
                                { label: '试卷录入', value: 'paper' },
                                { label: '试题录入', value: 'question' },
                            ]}
                            fieldProps={{
                                onChange: (e) => {
                                    setPaperData({ ...paperData, entryMode: e.target.value });
                                }
                            }}
                        />

                        <ProFormDependency name={['entryMode']}>
                            {({ entryMode }) => {
                                return entryMode === 'paper' ? (
                                    <ProFormText
                                        name="title"
                                        label="试卷标题"
                                        width="lg"
                                        placeholder="请输入试卷标题"
                                        rules={[{ required: true }]}
                                        initialValue={paperData?.title}
                                    />
                                ) : null;
                            }}
                        </ProFormDependency>

                        <ProForm.Group>
                            <ProFormSelect
                                name="subject"
                                label="学科"
                                width="md"
                                options={['数学', '语文', '英语', '物理', '化学', '生物', '历史', '地理', '政治']}
                                rules={[{ required: true }]}
                                initialValue={paperData?.subject}
                            />
                            <ProFormSelect
                                name="grade"
                                label="年级"
                                width="md"
                                options={['初一', '初二', '初三']}
                                rules={[{ required: true }]}
                                initialValue={paperData?.grade}
                            />
                        </ProForm.Group>

                        <ProFormDependency name={['entryMode']}>
                            {({ entryMode }) => {
                                if (entryMode === 'paper') {
                                    return (
                                        <>
                                            <ProForm.Group>
                                                <ProFormSelect
                                                    name="year"
                                                    label="年份"
                                                    width="sm"
                                                    placeholder="请选择年份"
                                                    options={['2025', '2024', '2023', '2022', '2021', '2020']}
                                                    initialValue={paperData?.year}
                                                />
                                                <ProFormSelect
                                                    name="region"
                                                    label="地区"
                                                    width="sm"
                                                    placeholder="请选择地区"
                                                    options={['全国', '北京', '上海', '江苏', '浙江', '山东', '河南', '河北', '广东']}
                                                    initialValue={paperData?.region}
                                                />
                                            </ProForm.Group>
                                            <Divider orientation="left">智能导入</Divider>
                                            <Upload
                                                beforeUpload={(file) => {
                                                    handleOCRUpload(file);
                                                    return false;
                                                }}
                                                showUploadList={false}
                                            >
                                                <Button icon={<UploadOutlined />}>上传试卷文件 (PDF/图片) 进行OCR识别</Button>
                                            </Upload>
                                            <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
                                                * 上传后系统将自动识别试卷结构和题目内容
                                            </div>
                                        </>
                                    );
                                }
                                return null;
                            }}
                        </ProFormDependency>
                    </StepsForm.StepForm>

                    <StepsForm.StepForm name="structure" title="试题录入">
                        <div style={{ marginBottom: 16 }}>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddQuestionVisible(true)}>
                                添加试题
                            </Button>
                        </div>

                        {/* 
                In a real implementation, this would be a complex nested form with 
                ProFormList for Sections -> ProFormList for Questions.
                For this MVP, we will display the structure if it was imported via OCR,
                or show a placeholder for manual entry.
             */}
                        {paperData?.sections ? (
                            <div>
                                <h3>已识别的试卷结构：</h3>
                                {paperData.sections.map((section: any, idx: number) => (
                                    <Card key={idx} title={section.name} style={{ marginBottom: 16 }} size="small">
                                        {section.questions.map((q: any, qIdx: number) => (
                                            <div key={qIdx} style={{ marginBottom: 12, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                                                <div style={{ fontWeight: 'bold' }}>{qIdx + 1}. {q.type} ({q.score}分)</div>
                                                <div dangerouslySetInnerHTML={{ __html: q.content }} />
                                                <div style={{ color: '#666', marginTop: 4 }}>答案：{q.answer}</div>
                                            </div>
                                        ))}
                                    </Card>
                                ))}
                                <div style={{ textAlign: 'center', color: '#999' }}>
                                    (此处支持对识别结果进行编辑修正，MVP版本暂略)
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                                暂无试题数据，请点击上方“添加试题”按钮进行录入，或在第一步上传试卷进行识别。
                            </div>
                        )}
                    </StepsForm.StepForm>
                </StepsForm>
            </Card>

            <Modal
                title="整卷预览"
                open={previewVisible}
                onCancel={() => setPreviewVisible(false)}
                footer={null}
                width={1000}
            >
                {paperData ? (
                    <div>
                        <h2 style={{ textAlign: 'center' }}>{paperData.title}</h2>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <Space split={<Divider type="vertical" />}>
                                <span>学科：{paperData.subject}</span>
                                <span>年份：{paperData.year}</span>
                                <span>地区：{paperData.region}</span>
                                <span>总分：{paperData.totalScore}</span>
                            </Space>
                        </div>
                        {paperData.sections?.map((section: any, idx: number) => (
                            <div key={idx} style={{ marginBottom: 24 }}>
                                <h3>{section.name}</h3>
                                {section.questions.map((q: any, qIdx: number) => (
                                    <div key={qIdx} style={{ marginBottom: 16 }}>
                                        <div style={{ display: 'flex' }}>
                                            <span style={{ fontWeight: 'bold', marginRight: 8 }}>{qIdx + 1}.</span>
                                            <div dangerouslySetInnerHTML={{ __html: q.content }} />
                                            <span style={{ marginLeft: 8, color: '#999' }}>({q.score}分)</span>
                                        </div>
                                        {q.options && (
                                            <div style={{ marginLeft: 24, marginTop: 8 }}>
                                                {q.options.map((opt: any, oIdx: number) => (
                                                    <div key={oIdx}>{String.fromCharCode(65 + oIdx)}. {opt}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>暂无数据</div>
                )}
            </Modal>

            <Modal
                title="添加试题"
                open={addQuestionVisible}
                onCancel={() => setAddQuestionVisible(false)}
                footer={null}
                width={1000}
                destroyOnClose
            >
                <SingleEntry
                    embedded
                    paperId={paperData?.entryMode === 'paper' ? paperData?.id : undefined}
                    paperContext={{
                        subject: paperData?.subject,
                        grade: paperData?.grade,
                        year: paperData?.year
                    }}
                    onSuccess={() => {
                        message.success('试题添加成功');
                    }}
                />
            </Modal>
        </PageContainer>
    );
};

export default PaperEntry;
