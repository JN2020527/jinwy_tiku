import { addPaper, parsePaper } from '@/services/questionEntry';
import {
    ProForm,
    ProFormDigit,
    ProFormSelect,
    ProFormText,
    StepsForm,
} from '@ant-design/pro-components';
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Card, Divider, message, Modal, Space, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import React, { useState } from 'react';

const PaperEntry: React.FC = () => {
    const [previewVisible, setPreviewVisible] = useState(false);
    const [paperData, setPaperData] = useState<any>();

    const handleFinish = async (values: any) => {
        try {
            // Transform values to match Paper interface
            // Note: This is a simplified transformation. In a real app, you'd need more complex logic
            // to handle the nested structure from the dynamic form.
            // For this MVP, we assume the 'questions' field in values contains the structured data
            // or we just save the metadata.

            // Since ProFormList inside StepsForm can be tricky with deep nesting, 
            // for this MVP we will focus on the "Smart Import" flow which populates the data.

            const paperPayload = {
                ...values,
                // If we had a full manual entry UI here, we would map it.
                // For now, we rely on the OCR result or basic metadata.
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
                        <ProFormText
                            name="title"
                            label="试卷标题"
                            width="lg"
                            placeholder="请输入试卷标题"
                            rules={[{ required: true }]}
                            initialValue={paperData?.title}
                        />
                        <ProForm.Group>
                            <ProFormSelect
                                name="subject"
                                label="学科"
                                width="md"
                                options={['前端技术', '后端技术']}
                                rules={[{ required: true }]}
                                initialValue={paperData?.subject}
                            />
                            <ProFormText
                                name="year"
                                label="年份"
                                width="sm"
                                placeholder="2025"
                                initialValue={paperData?.year}
                            />
                            <ProFormText
                                name="region"
                                label="地区"
                                width="sm"
                                placeholder="全国"
                                initialValue={paperData?.region}
                            />
                            <ProFormDigit
                                name="totalScore"
                                label="总分"
                                width="sm"
                                initialValue={paperData?.totalScore}
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
                    </StepsForm.StepForm>

                    <StepsForm.StepForm name="structure" title="试题录入">
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
                                暂无试题数据，请在第一步上传试卷进行识别，或等待后续版本开放手动结构化录入。
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
        </PageContainer>
    );
};

export default PaperEntry;
