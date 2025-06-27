import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const baseUrl = process.env.LLM_SERVER_URL || 'http://localhost:8000';
    const apiKey = process.env.CHAT_BOT_API_KEY;
    
    console.log('🔍 LLM健康检查:');
    console.log('  - 环境:', process.env.NODE_ENV);
    console.log('  - 服务器URL:', baseUrl);
    console.log('  - API密钥存在:', !!apiKey);
    console.log('  - API密钥长度:', apiKey?.length || 0);
    
    // 测试基本连接
    console.log('📡 测试基本连接...');
    const healthResponse = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📡 健康检查响应:', healthResponse.status);
    
    if (!healthResponse.ok) {
      throw new Error(`健康检查失败: ${healthResponse.status}`);
    }
    
    const healthData = await healthResponse.json();
    console.log('📡 健康检查数据:', healthData);
    
    // 测试认证
    if (apiKey) {
      console.log('🔐 测试API认证...');
      const authTestResponse = await fetch(`${baseUrl}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        }),
      });
      
      console.log('🔐 认证测试响应:', authTestResponse.status);
      
      return NextResponse.json({
        success: true,
        environment: process.env.NODE_ENV,
        baseUrl,
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length || 0,
        healthCheck: {
          status: healthResponse.status,
          data: healthData,
        },
        authTest: {
          status: authTestResponse.status,
          statusText: authTestResponse.statusText,
        },
      });
    }
    
    return NextResponse.json({
      success: true,
      environment: process.env.NODE_ENV,
      baseUrl,
      hasApiKey: !!apiKey,
      healthCheck: {
        status: healthResponse.status,
        data: healthData,
      },
      warning: 'No API key provided',
    });
    
  } catch (error) {
    console.error('❌ LLM健康检查失败:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.NODE_ENV,
      baseUrl: process.env.LLM_SERVER_URL || 'http://localhost:8000',
      hasApiKey: !!process.env.CHAT_BOT_API_KEY,
    }, { status: 500 });
  }
} 