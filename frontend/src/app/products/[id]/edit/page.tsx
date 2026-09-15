'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/lib/api';
import { Product, CreateProductData } from '@/types';
import { ArrowLeft, Save, Package } from 'lucide-react';
import { FadeIn, SlideIn, FormFieldAnimation, ScaleOnHover } from '@/components/animations';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;

  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [product, setProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState<CreateProductData>({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    category: '',
    sku: '',
    minStockLevel: 0,
  });

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  const loadProduct = async () => {
    try {
      const response = await apiClient.getProduct(productId);
      if (response.success && response.data?.product) {
        const productData: Product = response.data.product;
        setProduct(productData);
        setFormData({
          name: productData.name,
          description: productData.description || '',
          price: productData.price,
          stock: productData.stock,
          category: productData.category,
          sku: productData.sku || '',
          minStockLevel: productData.minStockLevel || 0,
        });
      } else {
        setError('Failed to load product');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load product');
    } finally {
      setLoadingProduct(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'stock' || name === 'minStockLevel'
        ? parseFloat(value) || 0
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await apiClient.updateProduct(productId, formData);
      if (response.success) {
        setSuccess('Product updated successfully!');
        setTimeout(() => {
          router.push('/products');
        }, 1200);
      } else {
        setError(response.message || 'Failed to update product');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  if (loadingProduct) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading product details...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!product) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button asChild variant="outline">
                <Link href="/products">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Products
                </Link>
              </Button>
            </div>
            <Alert variant="destructive">
              <AlertDescription>{error || 'Product not found'}</AlertDescription>
            </Alert>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <FadeIn delay={0.1}>
            <div className="flex items-center space-x-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/products">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Edit Product</h1>
                <p className="text-muted-foreground">Update product inventory details</p>
              </div>
            </div>
          </FadeIn>

          <SlideIn direction="up" duration={0.5}>
            <Card className="max-w-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Product Details
                </CardTitle>
                <CardDescription>Update information for {product.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {success && (
                    <Alert className="border-green-200 bg-green-50 text-green-800">
                      <AlertDescription>{success}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormFieldAnimation delay={0.2}>
                      <div className="space-y-2">
                        <Label htmlFor="name">Product Name *</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="transition-all duration-300 focus:scale-105"
                        />
                      </div>
                    </FormFieldAnimation>

                    <FormFieldAnimation delay={0.3}>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category *</Label>
                        <Input
                          id="category"
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          required
                          className="transition-all duration-300 focus:scale-105"
                        />
                      </div>
                    </FormFieldAnimation>
                  </div>

                  <FormFieldAnimation delay={0.4}>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        className="transition-all duration-300 focus:scale-105"
                      />
                    </div>
                  </FormFieldAnimation>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormFieldAnimation delay={0.5}>
                      <div className="space-y-2">
                        <Label htmlFor="price">Price ($) *</Label>
                        <Input
                          id="price"
                          name="price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.price}
                          onChange={handleChange}
                          required
                          className="transition-all duration-300 focus:scale-105"
                        />
                      </div>
                    </FormFieldAnimation>

                    <FormFieldAnimation delay={0.6}>
                      <div className="space-y-2">
                        <Label htmlFor="stock">Stock Quantity *</Label>
                        <Input
                          id="stock"
                          name="stock"
                          type="number"
                          min="0"
                          value={formData.stock}
                          onChange={handleChange}
                          required
                          className="transition-all duration-300 focus:scale-105"
                        />
                      </div>
                    </FormFieldAnimation>

                    <FormFieldAnimation delay={0.7}>
                      <div className="space-y-2">
                        <Label htmlFor="minStockLevel">Min Stock Level</Label>
                        <Input
                          id="minStockLevel"
                          name="minStockLevel"
                          type="number"
                          min="0"
                          value={formData.minStockLevel}
                          onChange={handleChange}
                          className="transition-all duration-300 focus:scale-105"
                        />
                      </div>
                    </FormFieldAnimation>
                  </div>

                  <FormFieldAnimation delay={0.8}>
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU (Optional)</Label>
                      <Input
                        id="sku"
                        name="sku"
                        value={formData.sku}
                        onChange={handleChange}
                        placeholder="e.g., PROD-001"
                        className="transition-all duration-300 focus:scale-105"
                      />
                    </div>
                  </FormFieldAnimation>

                  <FormFieldAnimation delay={0.9}>
                    <div className="flex space-x-2 pt-2">
                      <ScaleOnHover>
                        <Button type="submit" disabled={loading} className="transition-all duration-300">
                          <Save className="mr-2 h-4 w-4" />
                          {loading ? 'Saving...' : 'Update Product'}
                        </Button>
                      </ScaleOnHover>
                      <Button asChild type="button" variant="outline">
                        <Link href="/products">
                          Cancel
                        </Link>
                      </Button>
                    </div>
                  </FormFieldAnimation>
                </form>
              </CardContent>
            </Card>
          </SlideIn>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
